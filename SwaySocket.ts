import { Socket, connect } from "net";

const MAGIC = "i3-ipc";
const MAGIC_LENGTH = MAGIC.length;
const PAYLOAD_OFFSET = MAGIC_LENGTH + 8;

enum Command {
    RunCommand,
    GetWorkspaces,
    Subscribe,
    GetOutputs,
}

enum Event {
    Workspace,
    Output,
    Mode,
    Window,
    BarConfigUpdate,
    Binding,
    Shutdown,
    Tick
}

export class SwaySocket {
    private _socket: Socket;

    private constructor(socket: Socket) {
        this._socket = socket;

        this._socket.on("data", (message) => this._processMessages(message));
        this._socket.on("connect", () => {
            console.log("Connected!");
        });
        this._socket.on("ready", () => console.log("Ready!"));
        this._socket.on("readable", (...args) => console.log("Readable", ...args));
        this._socket.on("error", console.error);

        process.on("SIGINT", () => this.close());
        process.on("SIGTERM", () => this.close());
    }

    private close() {
        console.log("Closing socket");
        this._socket.destroy();
    }

    static async getSocket(): Promise<SwaySocket> {
        const getSocketPathProc = Bun.spawn(["sway", "--get-socketpath"]);
        await getSocketPathProc.exited;

        const socketPath = (
            await new Response(getSocketPathProc.stdout).text()
        ).trim();
        // console.log("Got sway socket path: ", socketPath);

        const socket = connect(socketPath);
        return new Promise((resolve) => {
            const swaySocket = new SwaySocket(socket);
            socket.on("connect", () => resolve(swaySocket));
        });
    }

    private _sendMessage(type: Command, payload: string) {
        const message = Buffer.alloc(PAYLOAD_OFFSET + 8);
        message.write(MAGIC);
        message.writeUInt32LE(payload.length, 6);
        message.writeUInt32LE(type, 10);
        if (payload.length > 0) {
            message.write(payload, PAYLOAD_OFFSET);
        }
    }

    private async _processMessages(message: Buffer) {
        console.log("Got message!");
        const response = await new Response(message).text();
        console.log(response);
    }

    on<T extends keyof Event>(event: T, handler: () => {}) {

    } 

    process(): Promise<void> {
        return new Promise((resolve) => {
            this._socket.once("close", () => {
                console.log("Socket ended");
                resolve();
            });
        });
    }
}
