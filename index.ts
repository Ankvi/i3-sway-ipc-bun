#!/usr/bin/env bun

import { Command } from "commander";
import { IpcSocket } from "./IpcSocket";
import { Provider } from "./types";

import { MonitorSetup } from "./features/monitorSetup";
import * as windowDimming from "./features/windowDimming";

declare module "bun" {
    export interface Env {
        IPC_PROVIDER: Provider;
        I3SOCK: string;
        SWAYSOCK: string;
    }
}

interface ProgramOptions {
    provider: Provider;
};

const program = new Command();
program
    .option("-p,--provider <provider>", "Provider to use (i3/sway)", "sway")
    .hook("preSubcommand", (command) => {
        const options = command.opts<ProgramOptions>();
        Bun.env.IPC_PROVIDER = options.provider ?? "sway";
    });

program
    .command("window-dimming")
    .action(async () => {
        const socket = await IpcSocket.getSocket();
        windowDimming.initialize(socket);
        await socket.process();
    })

program
    .command("monitor-setup")
    .action(async () => {
        const socket = await IpcSocket.getSocket();
        const monitorSetup = await MonitorSetup.initialize(socket);
        await monitorSetup.initialize()
        socket.close();
    })

await program.parseAsync();
