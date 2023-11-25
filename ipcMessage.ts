import { Command, CommandPayloads, getCommandName } from "./types/commands";
import { IpcEvent, IpcEventNames } from "./types/events";
import logger from "./logging";
import { InvalidHeaderError } from "./errors";

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

