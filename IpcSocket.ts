import { Socket, connect } from "net";
import { IpcEvent } from "./types/event";
import { IpcMessage, create } from "./IpcMessage";
import { Command } from "./types/command";
import { randomUUID } from "crypto";

const socketPathEnvVars = {
    sway: Bun.env.SWAYSOCK,
    i3: Bun.env.I3SOCK
} as const;

type Listeners = { [K in IpcEvent]: Map<string, (payload: string) => void> };

export class IpcSocket {
    private _socket: Socket;
    private _listeners: Listeners;

    private constructor(socket: Socket) {
        this._socket = socket;

        // this._socket.on("data", (message) => this._processMessages(message));
        this._socket.on("connect", () => {
            this._subscribeToEvents();
        });
        this._socket.on("readable", () => this._processMessage());
        this._socket.on("error", console.error);

        this._listeners = Object.values(IpcEvent).reduce<Listeners>((output, event) => {
            output[event] = new Map();
            return output;
        }, {} as Listeners);

        process.on("SIGINT", () => this._close());
        process.on("SIGTERM", () => this._close());
    }

    static async getSocket(provider: "sway" | "i3" = "sway"): Promise<IpcSocket> {
        let socketPath = socketPathEnvVars[provider];
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
        // const command = create(Command.Subscribe, JSON.stringify(eventNames));
        const command = create(Command.Subscribe, ["window"]);
        this._sendMessage(command);
    }

    private _close() {
        console.log("Closing socket");
        this._socket.destroy();
    }

    private _sendMessage(message: Buffer) {
        // console.log("Sending message");
        this._socket.write(message);
    }
    
    private _processMessage() {
        const message = new IpcMessage(this._socket);
        const listeners = this._listeners[message.type];
        for (const listener of listeners.values()) {
            listener(message.getPayload());
        }
        // console.log(`Processed message through 'readable' event: ${message.getPayload()}`);
    }

    // private async _processMessages(message: Buffer) {
    //     const response = await new Response(message).text();
    //     console.log(`Processed message through 'data' event: ${response}`);
    // }

    on<T extends IpcEvent>(event: T, handler: () => void): string {
        const guid = randomUUID();
        this._listeners[event].set(guid, handler);
        return guid;
    }

    delete<T extends IpcEvent>(event: T, guid: string) {
        this._listeners[event].delete(guid);
    }

    once<T extends IpcEvent>(event: T, handler: (payload: string) => void) {
        const guid = randomUUID();
        this._listeners[event].set(guid, (payload: string) => {
            handler(payload);
            this._listeners[event].delete(guid);
        })
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
