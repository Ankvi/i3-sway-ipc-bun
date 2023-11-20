import { Socket } from "net";
import { Command, CommandPayloads } from "./types/command";
import { IpcEvent } from "./types/event";

const MAGIC = "i3-ipc";
const MAGIC_LENGTH = MAGIC.length;
const HEADER_LENGTH = MAGIC_LENGTH + 8;

export function create<T extends keyof CommandPayloads>(type: T, payload: CommandPayloads[T]): Buffer {
    const stringified = JSON.stringify(payload);
    const message = Buffer.alloc(HEADER_LENGTH + stringified.length);
    message.write(MAGIC);
    message.writeUInt32LE(stringified.length, 6);
    message.writeUInt32LE(type, 10);
    if (stringified.length > 0) {
        message.write(stringified, HEADER_LENGTH);
    }
    return message;
}

export class IpcMessage {
    private _payload?: Buffer;
    private _type: Command | IpcEvent;
    public isEvent: boolean;

    constructor(socket: Socket) {
        const header: Buffer = socket.read(HEADER_LENGTH);
        const magic = header.subarray(0, MAGIC_LENGTH).toString();
        if (magic !== MAGIC) {
            throw new Error(`Magic mismatch. Expected ${MAGIC}, but found ${magic}`)
        }
        const payloadLength = header.readUInt32LE(MAGIC_LENGTH);
        this._type = header.readUInt16LE(MAGIC_LENGTH + 4) as IpcEvent;
        this.isEvent = (header.readUInt8(MAGIC_LENGTH + 7) & 0x80) === 0x80;

        if (payloadLength > 0) {
            this._payload = socket.read(payloadLength);
        }
    }

    getPayload(): string {
        if (this._payload) {
            return this._payload.toString();
        }
        return "";
    }

    getType() {
        if (this.isEvent) {
            return this._type as IpcEvent;
        }
        return this._type as Command;
    }
}

