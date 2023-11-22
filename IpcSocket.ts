import { Socket, connect } from "net";
import { IpcEvent, IpcEventHandler } from "./types/events";
import { IpcMessage, create } from "./IpcMessage";
import { Command, CommandPayloads, CommandReplies, getCommandName } from "./types/commands";
import { randomUUID } from "crypto";
import { Output } from "./types/output";
import { Provider } from "./types";
import { getMessageCommand, getSocketPath } from "./config";

type EventListeners = {
    [K in IpcEvent]: Map<string, IpcEventHandler<K>>;
};
// type CommandResponseListeners = {
//     [K in Command]: Map<string, (payload: CommandReplies[K]) => void>;
// };

export class IpcSocket {
    private _socket: Socket;
    private _eventListeners: EventListeners;
    // private _commandResponseListeners: CommandResponseListeners;
    private _onCloseListeners: (() => void)[] = [];

    private constructor(socket: Socket) {
        this._socket = socket;

        this._socket.on("connect", () => {
            this._subscribeToEvents();
        });
        this._socket.on("readable", () => this._processMessage());
        this._socket.on("error", console.error);

        this._eventListeners = Object.values(IpcEvent).reduce<EventListeners>(
            (output, event) => {
                output[event] = new Map();
                return output;
            },
            {} as EventListeners,
        );

        // this._commandResponseListeners = Object.values(
        //     Command,
        // ).reduce<CommandResponseListeners>((output, event) => {
        //     output[event] = new Map();
        //     return output;
        // }, {} as CommandResponseListeners);

        process.on("SIGINT", () => this._close());
        process.on("SIGTERM", () => this._close());
    }

    static async getSocket(
        provider: Provider = "sway",
    ): Promise<IpcSocket> {
        let socketPath = getSocketPath(); 
        if (!socketPath) {
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

    private _close() {
        console.log("Closing socket");
        this._socket.destroy();
        for (const handler of this._onCloseListeners) {
            handler();
        }
    }

    private _sendMessage(message: Buffer) {
        this._socket.write(message);
    }

    private _processMessage() {
        const message = new IpcMessage(this._socket);
        const payloadString = message.getPayload();
        if (message.isEvent) {
            const payload = JSON.parse(payloadString);
            const type = message.getType() as IpcEvent;
            const listeners = this._eventListeners[type];
            for (const listener of listeners.values()) {
                listener(payload);
            }
            return;
        }
        console.log("Received command: ", payloadString);
        // const type = message.getType() as Command;
        // const listeners = this._commandResponseListeners[type];
        // for (const [key, listener] of listeners.entries()) {
        //     const payload = JSON.parse(message.getPayload());
        //     listener(payload);
        //     listeners.delete(key);
        // }
    }

    on<T extends IpcEvent>(event: T, handler: IpcEventHandler<T>): string {
        const guid = randomUUID();
        this._eventListeners[event].set(guid, handler);
        return guid;
    }

    delete<T extends IpcEvent>(event: T, guid: string) {
        this._eventListeners[event].delete(guid);
    }

    once<T extends IpcEvent>(event: T, handler: IpcEventHandler<T>) {
        const guid = randomUUID();
        this._eventListeners[event].set(guid, (payload) => {
            handler(payload);
            this._eventListeners[event].delete(guid);
        });
    }

    onClose(handler: () => void) {
        this._onCloseListeners.push(handler);
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
            throw new Error(error);
        }

        const response = await new Response(proc.stdout).json<
            CommandReplies[T]
        >();
        return response;
    }

    async outputs(): Promise<Output[]> {
        return await this.command(Command.get_outputs, null);
    }

    process(): Promise<void> {
        return new Promise((resolve) => {
            this._socket.once("close", () => {
                console.log("Socket closed");
                resolve();
            });
        });
    }
}
