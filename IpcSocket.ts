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
    CommandPayloads,
    CommandReplies,
    getCommandName,
} from "./types/commands";
import { Output } from "./types/containers";
import { getMessageCommand, getSocketPath } from "./config";
import logger from "./logging";
import { InvalidHeaderError, InvalidPayloadError } from "./errors";
import EventEmitter from "events";

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
        process.on("SIGKILL", async () => await this.close());
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

        const endListenersConfirmed = new Promise<void>((resolve) => {
            const endListeners = this.listenerCount("end");
            if (!endListeners) {
                resolve();
                return;
            }

            logger.info(`Waiting for ${endListeners} to send end-ack`);

            const endTimeout = setTimeout(() => {
                logger.info("end-ack timed out. Force exiting.");
                resolve();
            }, 5000);
            let acksReceived = 0;
            this.on("end-ack", () => {
                acksReceived++;
                if (endListeners === acksReceived) {
                    logger.info("Received all end-acks");
                    clearTimeout(endTimeout);
                    resolve();
                }
            });
        });
        logger.info("Emitting end event");
        this.emit(SocketEvent.End);

        await Promise.all([ipcSocketClosed, endListenersConfirmed]);

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

                const decodedHeader = decodeHeader(header);
                const isEvent = decodedHeader.isEvent;

                const type = decodedHeader.type;
                const payloadLength = decodedHeader.payloadLength;

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
                } else if (error instanceof InvalidPayloadError) {
                    logger.warn(error.message);
                } else if (error instanceof Error) {
                    logger.warn("Could not parse payload string");
                    logger.warn("Message:", error.message);
                }
                continue;
            } finally {
                console.log("---------------------");
                console.log("Processed event");
                console.log(
                    `bytesRead: ${bytesRead}, socket.readableLength: ${readableLength}`,
                );
            }
        }
    }

    private _handleWindowEvent(event: WindowEvent) {
        logger.info(`Got window event with change: "${event.change}"`);
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

    async command<T extends Command>(
        command: T,
        payload: CommandPayloads[T],
    ): Promise<CommandReplies[T]> {
        const msgCommand = getMessageCommand();

        const commandName = getCommandName(command);

        const msgArgs: string[] = [...msgCommand, "-t", commandName];
        if (payload) {
            msgArgs.push("-m", JSON.stringify(payload));
        }

        const proc = Bun.spawn(msgArgs, {
            stderr: "pipe",
        });
        const exitCode = await proc.exited;
        if (exitCode) {
            const error = await new Response(proc.stderr).text();
            logger.error(error);
            throw new Error(error);
        }

        const response = await new Response(proc.stdout).json<
            CommandReplies[T]
        >();
        return response;
    }

    async getTree() {
        return await this.command(Command.get_tree, null);
    }

    async getOutputs() {
        return await this.command(Command.get_outputs, null);
    }

    async outputs(): Promise<Output[]> {
        return await this.command(Command.get_outputs, null);
    }

    process(): Promise<void> {
        return new Promise((resolve) => {
            this.once("close", () => {
                resolve();
            });
        });
    }
}
