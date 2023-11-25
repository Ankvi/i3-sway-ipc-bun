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
        process.on("SIGKILL", () => this.close());
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
        // const eventNames = Object.keys(IpcEvent);
        const command = create(Command.subscribe, ["window"]);
        this._sendMessage(command);
    }

    public async close() {
        logger.info("Closing socket");
        this._socket.destroy();
        this.emit(SocketEvent.Close);
    }

    private _sendMessage(message: Buffer) {
        this._socket.write(message);
    }

    private _processMessage() {
        const readableLength = this._socket.readableLength;
        let bytesRead = 0;
        while (bytesRead < readableLength) {

            try {
                // const buffer: Buffer = this._socket.read(readableLength);
                //
                // const header = buffer.subarray(0, HEADER_LENGTH);
                const header = this._socket.read(HEADER_LENGTH);
                bytesRead += HEADER_LENGTH;
                if (!header) {
                    logger.warn("Message has no header");
                    continue;
                }
                logger.info("Received message header:", header.toString("hex"));

                const decodedHeader = decodeHeader(header);
                const isEvent = decodedHeader.isEvent;

                const type = decodedHeader.type;
                const payloadLength = decodedHeader.payloadLength;

                const payloadEnd = payloadLength + HEADER_LENGTH;
                // const payload = buffer.subarray(HEADER_LENGTH, payloadEnd);
                
                const payload: Buffer = this._socket.read(payloadLength);
                bytesRead += payloadLength;

                const payloadString = payload.toString("utf-8");

                if (!isEvent) {
                    logger.info("Received command:", payloadString);
                    continue;
                }

                if (payloadEnd !== readableLength) {
                    logger.warn(
                        `Header+payload length (${payloadEnd}) does not match the readable length in the buffer ${readableLength}.`,
                    );
                }
                
                try {
                    switch (type) {
                        case IpcEvent.window: {
                            const event: WindowEvent = JSON.parse(payloadString);
                            this.emit(SocketEvent.WindowFocusChanged, event.container);
                        }
                    } 
                } catch (error) {
                    logger.error("Emitting error failed:", (error as Error).message);
                }

                    // const listeners = this._eventListeners[type];
                    // for (const listener of listeners.values()) {
                    //     listener(payload);
                    // }
                    // return;
            } catch (error) {
                if (error instanceof InvalidHeaderError) {
                    logger.warn("Could not read header from message");
                } else if (error instanceof InvalidPayloadError) {
                    logger.warn(error.message);
                } else if (error instanceof Error) {
                    logger.warn("Could not parse payload string");
                    logger.warn("Message:", error.message);
                    // logger.warn("Actual payload:\n", payloadString);
                }
                continue;
            } finally {
                console.log("---------------------");
                console.log("Processed event");
                console.log(`bytesRead: ${bytesRead}, socket.bytesRead: ${this._socket.bytesRead}, socket.readableLength: ${readableLength}`);
            }
        }
    }

    // on<T extends IpcEvent>(event: T, handler: IpcEventHandler<T>): string {
    //     const guid = randomUUID();
    //     this._eventListeners[event].set(guid, handler);
    //     return guid;
    // }

    // delete<T extends IpcEvent>(event: T, guid: string) {
    //     this._eventListeners[event].delete(guid);
    // }

    // once<T extends IpcEvent>(event: T, handler: IpcEventHandler<T>) {
    //     const guid = randomUUID();
    //     this._eventListeners[event].set(guid, (payload) => {
    //         handler(payload);
    //         this._eventListeners[event].delete(guid);
    //     });
    // }

    // onClose(handler: () => void | Promise<void>) {
    //     this._onCloseListeners.push(handler);
    // }

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
            this._socket.once("close", () => {
                logger.info("Socket closed");
                resolve();
            });
        });
    }
}
