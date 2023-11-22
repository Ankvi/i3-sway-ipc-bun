import { getMessageCommand } from "./config";

export async function opacity(pid: number, value: number) {
    if (!pid) {
        return;
    }
    if (value < 0 || value > 1) {
        throw new Error("Value is not between 0 and 1");
    }
    const command = [...getMessageCommand(), `[pid=${pid}]`, "opacity", value.toFixed(1)];
    const proc = Bun.spawn(command);
    await proc.exited;
}
