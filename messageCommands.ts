import { getMessageCommand } from "./config";

export async function opacity(pid: number, value: number) {
    if (value < 0 || value > 1) {
        throw new Error("Value is not between 0 and 1");
    }
    await Bun.spawn([getMessageCommand(), `"[pid=${pid}] opacity ${value}"`])
        .exited;
}
