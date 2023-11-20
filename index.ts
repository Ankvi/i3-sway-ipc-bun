import { Command } from "commander";
import { IpcSocket } from "./IpcSocket";
import { Provider } from "./types";

interface ProgramOptions {
    keepServerAlive: boolean;
    provider: Provider;
};

const program = new Command();
program
    .option("--keep-server-alive")
    .option("-p,--provider <provider>", "Provider to use (i3/sway)", "sway");


interface StartServerOptions extends ProgramOptions {
    windowDimming: boolean;
}

program
    .command("start-server")
    .option("--window-dimming", "Dims windows/workspaces that are not currently focused")
    .action(async ({ provider, windowDimming }: StartServerOptions) => {
        const socket = await IpcSocket.getSocket(provider);

        await socket.process();
    })

await program.parseAsync();
