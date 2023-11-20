import { Socket, connect } from "net";
import { IpcEvent } from "./types/event";
import { IpcMessage, create } from "./IpcMessage";
import { Command, CommandPayloads, CommandReplies, getCommandName } from "./types/command";
import { randomUUID } from "crypto";
import { Output } from "./types/output";
import { Provider } from "./types";

const COMMAND_CONFIG = {
    i3: "i3-msg",
    sway: "swaymsg --raw",
} as const;

const SOCKET_ENV_VAR_CONFIG = {
    sway: Bun.env.SWAYSOCK,
    i3: Bun.env.I3SOCK,
} as const;

type EventListeners = {
    [K in IpcEvent]: Map<string, (payload: string) => void>;
};
// type CommandResponseListeners = {
//     [K in Command]: Map<string, (payload: CommandReplies[K]) => void>;
// };

export class IpcSocket {
    private _provider: Provider; 
    private _socket: Socket;
    private _eventListeners: EventListeners;
    // private _commandResponseListeners: CommandResponseListeners;

    private constructor(provider: "i3" | "sway", socket: Socket) {
        this._provider = provider;
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
        let socketPath = SOCKET_ENV_VAR_CONFIG[provider];
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
            const swaySocket = new IpcSocket(provider, socket);
            socket.once("connect", () => resolve(swaySocket));
        });
    }

    private _subscribeToEvents() {
        const eventNames = Object.keys(IpcEvent);
        const command = create(Command.subscribe, eventNames);
        this._sendMessage(command);
    }

    private _close() {
        console.log("Closing socket");
        this._socket.destroy();
    }

    private _sendMessage(message: Buffer) {
        this._socket.write(message);
    }

    private _processMessage() {
        const message = new IpcMessage(this._socket);
        if (message.isEvent) {
            const type = message.getType() as IpcEvent;
            const listeners = this._eventListeners[type];
            for (const listener of listeners.values()) {
                listener(message.getPayload());
            }
            return;
        }
        console.log("Received command. Skipping");
        // const type = message.getType() as Command;
        // const listeners = this._commandResponseListeners[type];
        // for (const [key, listener] of listeners.entries()) {
        //     const payload = JSON.parse(message.getPayload());
        //     listener(payload);
        //     listeners.delete(key);
        // }
    }

    on<T extends IpcEvent>(event: T, handler: () => void): string {
        const guid = randomUUID();
        this._eventListeners[event].set(guid, handler);
        return guid;
    }

    delete<T extends IpcEvent>(event: T, guid: string) {
        this._eventListeners[event].delete(guid);
    }

    once<T extends IpcEvent>(event: T, handler: (payload: string) => void) {
        const guid = randomUUID();
        this._eventListeners[event].set(guid, (payload: string) => {
            handler(payload);
            this._eventListeners[event].delete(guid);
        });
    }

    async command<T extends Command>(
        command: T,
        payload: CommandPayloads[T],
    ): Promise<CommandReplies[T]> {
        const msgCommand = COMMAND_CONFIG[this._provider];

        const commandName = getCommandName(command);

        const msgArgs: string[] = [msgCommand, "-t", commandName];
        if (payload) {
            msgArgs.push("-m", JSON.stringify(payload));
        }

        const proc = Bun.spawn([msgCommand, "-t", commandName], {
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
