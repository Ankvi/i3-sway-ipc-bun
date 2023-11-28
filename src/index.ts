#!/usr/bin/env bun

import { Command } from "commander";
import { Provider } from "./types";
import { MonitorSetup, MonitorSetupArgs } from "./features/monitorSetup";
import { WindowDimming } from "./features/windowDimming";
import logger, { Severity, setMinimumSeverity, severities } from "./logging";

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
        .option("-v, --verbose [severity]", "Set verbosity level", (value) => {
            const found = severities.find(x => x === value);
            if (found) {
                return found;
            }
            logger.warn(`Could not find supported verbosity level "${value}". Setting default level ${Severity.Warning}`);
            return Severity.Warning;
        })
        .hook("preSubcommand", (command) => {
            const options = command.opts<ProgramOptions>();
            Bun.env.IPC_PROVIDER = options.provider ?? "sway";
            setMinimumSeverity(options.verbose);
        });

    program
        .command("window-dimming")
        .action(async () => {
            await WindowDimming.start();
        });

    const monitorSetup = program
        .command("monitor-setup");

    monitorSetup
        .command("load")
        .option("--setup-file <path>", "Optional path to a monitor setup file")
        .action(async (args: MonitorSetupArgs) => {
            const monitorSetup = await MonitorSetup.initialize(args);
            await monitorSetup.checkAndLoadSetup();
        });

    monitorSetup
        .command("save-current")
        .option("--setup-file <path>", "Optional path to a monitor setup file")
        .action(async (args: MonitorSetupArgs) => {
            const monitorSetup = await MonitorSetup.initialize(args);
            await monitorSetup.saveCurrentSetup();
        });
        

    await program.parseAsync();
} catch (error) {
    if (error instanceof Error) {
        logger.error("Got unhandled error:", error.message);
    }
}
