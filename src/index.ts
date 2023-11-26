#!/usr/bin/env bun

import { Command } from "commander";
import { IpcSocket } from "./IpcSocket";
import { Provider } from "./types";

import { MonitorSetup, MonitorSetupArgs } from "./features/monitorSetup";
import { WindowDimming } from "./features/windowDimming";
import logger, { Severity } from "./logging";

declare module "bun" {
    export interface Env {
        IPC_PROVIDER: Provider;
        I3SOCK: string;
        SWAYSOCK: string;
        MINIMUM_SEVERITY: Severity;
    }
}

interface ProgramOptions {
    provider: Provider;
    verbose: Severity | boolean;
}

try {
    const program = new Command();
    program
        .option("-p,--provider <provider>", "Provider to use (i3/sway)", "sway")
        .option("-v, --verbose [severity]", "Set verbosity level", (value, previous) => {
            if (!value) {
                return Severity.Warning;
            }

            console.log(previous);
        })
        .hook("preSubcommand", (command) => {
            const options = command.opts<ProgramOptions>();
            Bun.env.IPC_PROVIDER = options.provider ?? "sway";
            console.log("Verbosity", options.verbose);
        });

    program.command("window-dimming").action(async () => {
        const socket = await IpcSocket.getSocket();
        await WindowDimming.start(socket);
        await socket.process();
    });

    program
        .command("monitor-setup")
        .option("--setup-file <path>", "Optional path to a monitor setup file")
        .action(async (args: MonitorSetupArgs) => {
            const monitorSetup = await MonitorSetup.initialize(args);
            await monitorSetup.checkAndLoadSetup();
        });

    await program.parseAsync();
} catch (error) {
    if (error instanceof Error) {
        logger.error("Got unhandled error:", error.message);
    }
}
