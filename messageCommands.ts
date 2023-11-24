import { getMessageCommand } from "./config";
import { Content, FloatingContent } from "./types/containers";

export async function opacity(content: Content | FloatingContent, value: number) {
    if (value < 0 || value > 1) {
        throw new Error("Value is not between 0 and 1");
    }
    const command = [...getMessageCommand(), `[con_id=${content.id}]`, "opacity", value.toFixed(1)];
    const proc = Bun.spawn(command);
    await proc.exited;
}
