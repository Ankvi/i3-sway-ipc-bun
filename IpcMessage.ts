import { Socket } from "net";
import { Command, CommandPayloads, getCommandName } from "./types/commands";
import { IpcEvent, IpcEventNames } from "./types/events";
import logger from "./logging";
import { InvalidHeaderError, InvalidPayloadError } from "./errors";

const MAGIC = Buffer.from("i3-ipc");
const MAGIC_LENGTH = MAGIC.length;
export const HEADER_LENGTH = MAGIC_LENGTH + 8;

export function create<T extends keyof CommandPayloads>(
    type: T,
    payload: CommandPayloads[T],
): Buffer {
    const stringified = JSON.stringify(payload);
    const message = Buffer.alloc(HEADER_LENGTH + stringified.length);
    MAGIC.copy(message);
    message.writeUInt32LE(stringified.length, MAGIC_LENGTH);
    message.writeUInt32LE(type, 10);
    if (stringified.length > 0) {
        message.write(stringified, HEADER_LENGTH);
    }
    return message;
}

export function decodeHeader(buffer: Buffer) {
    const magic = buffer.subarray(0, MAGIC_LENGTH);
    if (!magic.equals(MAGIC)) {
        throw new InvalidHeaderError(
            `Magic mismatch. Expected ${MAGIC}, but found ${magic}`,
        );
    }
    const payloadLength = buffer.readUInt32LE(MAGIC_LENGTH);
    const type = buffer.readUInt16LE(MAGIC_LENGTH + 4) as IpcEvent;
    const isEvent = (buffer.readUInt32LE(MAGIC_LENGTH + 4) & (1 << 32)) > 0;
    // const isEvent = (type & (1 << 32)) > 0;
    //
    //
    logger.info(
        `Got ${isEvent ? "event" : "command reply"}: "${
            isEvent ? IpcEventNames[type] : getCommandName(type as Command)
        }" with payload length: ${payloadLength}`,
    );

    return {
        type,
        isEvent,
        payloadLength,
    };
}

export class IpcMessage {
    private _payload: Buffer;
    public type: Command | IpcEvent;
    public isEvent: boolean;

    constructor(socket: Socket) {
        const readableLength = socket.readableLength;
        const buffer: Buffer = socket.read(readableLength);
        const header = buffer.subarray(0, HEADER_LENGTH);
        if (!header) {
            throw new InvalidHeaderError();
        }
        logger.info("Received message header:", header.toString("hex"));

        const decodedHeader = decodeHeader(header);

        this.type = decodedHeader.type;
        this.isEvent = decodedHeader.isEvent;
        const payloadLength = decodedHeader.payloadLength;

        const payloadEnd = payloadLength + HEADER_LENGTH;
        this._payload = buffer.subarray(HEADER_LENGTH, payloadEnd);

        if (payloadEnd !== readableLength) {
            logger.warn(`Header+payload length (${payloadEnd}) does not match the readable length in the buffer ${readableLength}.`)
        //     throw new Error(`Mismatch in buffer lengths. Buffer: ${buffer.length}. Header+Payload: ${HEADER_LENGTH + payloadLength}. Payload:\n${buffer.subarray(HEADER_LENGTH, readableLength).toString("utf-8")}`);
        }

        if (!this._payload) throw new InvalidPayloadError("No payload found");

    }

    public get payload() {
        try {
            return JSON.parse(this._payload.toString("utf-8"));
        } catch (error) {
            throw new InvalidPayloadError("Unable to parse json")
        }
    }
}
