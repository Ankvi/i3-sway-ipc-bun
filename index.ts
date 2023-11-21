#!/usr/bin/env bun

import { Command } from "commander";
import { IpcSocket } from "./IpcSocket";
import { Provider } from "./types";

import * as monitorSetup from "./features/monitorSetup";
import * as windowDimming from "./features/windowDimming";

interface ProgramOptions {
    provider: Provider;
};

const program = new Command();
program
    .option("-p,--provider <provider>", "Provider to use (i3/sway)", "sway");

program
    .command("window-dimming")
    .action(async ({ provider }: ProgramOptions) => {
        const socket = await IpcSocket.getSocket(provider);
        windowDimming.initialize(socket);
        await socket.process();
    })

program
    .command("monitor-setup")
    .action(async ({ provider }: ProgramOptions) => {
        const socket = await IpcSocket.getSocket(provider);
        monitorSetup.initialize(socket);
        await socket.process();
    })

await program.parseAsync();
