import { Command } from "commander";
import { IpcSocket } from "./IpcSocket";

const program = new Command();

program
    .command("start-server")
    .option("--i3", "Use i3 instead of Sway")
    .action(async ({ i3 }) => {
        const socket = await IpcSocket.getSocket(i3 ? "i3" : "sway");

        await socket.process();
    })

await program.parseAsync();
