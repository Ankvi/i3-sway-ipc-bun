import { describe, expect, test } from "bun:test";
import { HEADER_LENGTH, create, decodeHeader } from "../ipcMessage";
import { Command, CommandPayloads } from "../types/commands";

describe("IpcMessage tests", () => {
	describe("Encoding and decoding", () => {
		test("Encoding a command should decode into the expected result", () => {
			const encoded = create(Command.subscribe, ["window"]);
			const decodedHeader = decodeHeader(encoded);
			const payload = encoded.subarray(HEADER_LENGTH).toString("utf-8");
			expect(decodedHeader.payloadLength).toEqual('["window"]'.length);
			expect(decodedHeader.isEvent).toBeFalse();
			expect(decodedHeader.type).toEqual(Command.subscribe);
			expect(payload).toEqual('["window"]');
		});
	});
});
