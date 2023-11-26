import EventEmitter from "events";
import { Socket, connect } from "net";
import {
    IpcEvent,
    SocketEvent,
    SocketEvents,
    WindowEvent,
} from "./types/events";
import { HEADER_LENGTH, create, decodeHeader } from "./ipcMessage";
import {
    Command,
} from "./types/commands";
import { getSocketPath } from "./config";
import logger from "./logging";
import { InvalidHeaderError } from "./errors";

export class IpcSocket extends EventEmitter<SocketEvents> {
    private _socket: Socket;

    private constructor(socket: Socket) {
        super();

        this._socket = socket;
        this._socket.on("connect", () => {
            this._subscribeToEvents();
        });
        this._socket.on("readable", () => this._processMessage());
        this._socket.on("error", logger.error);

        process.on("SIGINT", async () => await this.close());
        process.on("SIGTERM", async () => await this.close());
    }

    static async getSocket(): Promise<IpcSocket> {
        let socketPath = getSocketPath();
        if (!socketPath) {
            const provider = Bun.env.IPC_PROVIDER;
            const getSocketPathProc = Bun.spawn([provider, "--get-socketpath"]);
            await getSocketPathProc.exited;

            socketPath = (
                await new Response(getSocketPathProc.stdout).text()
            ).trim();
        }

        if (!socketPath) {
            throw new Error("No socket path was found");
        }

        const socket = connect(socketPath);
        return new Promise((resolve) => {
            const swaySocket = new IpcSocket(socket);
            socket.once("connect", () => resolve(swaySocket));
        });
    }

    private _subscribeToEvents() {
        const command = create(Command.subscribe, ["window"]);
        this._sendMessage(command);
    }

    public async close(): Promise<void> {
        logger.info("Closing socket");

        const ipcSocketClosed = new Promise<void>((resolve) => {
            this._socket.once("close", () => {
                logger.info("IPC Socket closed");
                resolve();
            });
        });

        this._socket.destroy();

        logger.info("Emitting end event");
        this.emit(SocketEvent.End);

        await ipcSocketClosed;

        logger.info("Emitting close event");
        this.emit(SocketEvent.Close);
    }

    private _sendMessage(message: Buffer) {
        this._socket.write(message);
    }

    private _processMessage() {
        const readableLength = this._socket.readableLength;
        const message: Buffer = this._socket.read();
        let bytesRead = 0;
        while (bytesRead < readableLength) {
            try {
                const header = message.subarray(
                    bytesRead,
                    bytesRead + HEADER_LENGTH,
                );
                bytesRead += HEADER_LENGTH;
                if (!header) {
                    logger.warn("Message has no header");
                    continue;
                }

                const { isEvent, type, payloadLength } = decodeHeader(header);

                const payload = message.subarray(
                    bytesRead,
                    bytesRead + payloadLength,
                );
                bytesRead += payloadLength;

                const payloadString = payload.toString("utf-8");

                if (!isEvent) {
                    logger.info("Received command:", payloadString);
                    continue;
                }

                try {
                    switch (type) {
                        case IpcEvent.window: {
                            const event: WindowEvent =
                                JSON.parse(payloadString);
                            this._handleWindowEvent(event);
                            break;
                        }
                    }
                } catch (error) {
                    logger.error(
                        "Emitting error failed:",
                        (error as Error).message,
                    );
                }
            } catch (error) {
                if (error instanceof InvalidHeaderError) {
                    logger.warn("Could not read header from message");
                } else if (error instanceof Error) {
                    logger.warn("Could not parse payload string");
                    logger.warn("Message:", error.message);
                }
            } finally {
                logger.debug("---------------------");
                logger.debug("Processed event");
                logger.debug(
                    `bytesRead: ${bytesRead}, socket.readableLength: ${readableLength}`,
                );
                logger.debug("---------------------");
            }
        }
    }

    private _handleWindowEvent(event: WindowEvent) {
        logger.debug(`Got window event with change: "${event.change}"`);
        switch (event.change) {
            case "focus": {
                this.emit("window-focus-changed", event.container);
                return;
            }
            case "move": {
                this.emit("window-moved", event.container);
                return;
            }
            default: {
                logger.warn(
                    "Received unknown window event change:",
                    event.change,
                );
            }
        }
    }

    process(): Promise<void> {
        return new Promise((resolve) => {
            this.once("close", () => {
                resolve();
            });
        });
    }
}
