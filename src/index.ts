#!/usr/bin/env bun

import * as commander from "commander";
import { Provider } from "./types";
import { MonitorSetup, MonitorSetupArgs } from "./features/monitorSetup";
import { WindowDimming } from "./features/windowDimming";
import logger, { Severity, setMinimumSeverity, severities } from "./logging";
import { command } from "./messageCommands";
import { Command } from "./types/commands";
import { flattenTree } from "./utilities";
import { Content, FloatingContent, isContent } from "./types/containers";
import { getMessageCommand } from "./config";

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
    const program = new commander.Command();
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

    const windowDimming = program
        .command("window-dimming")

    windowDimming
        .command("start")
        .action(async () => {
            await WindowDimming.start();
        });

    windowDimming
        .command("stop")
        .action(async () => {
            await WindowDimming.stopExisting();
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
        
    program
        .command("task-switcher")
        .action(async () => {
            const tree = await command(Command.get_tree);
            const nodes = flattenTree(tree);
            const windows = nodes
                .filter<Content | FloatingContent>(isContent)
                .filter(x => x.rect.x > 0 && x.rect.y > 0);

            const proc = Bun.spawn(["wofi", "--show", "dmenu"], {
                stdin: "pipe"
            });

            const names = windows
                .map(x => x.name)
                .join("\n");

            proc.stdin.write(names);
            proc.stdin.end();

            await proc.exited;

            const selectedName = (await new Response(proc.stdout).text()).trim();
            logger.debug("Selected name:", selectedName);

            const selected = windows.find(x => x.name === selectedName);
            if (!selected) {
                logger.info("Nothing was selected");
                return;
            } 


            await Bun.spawn([
                ...getMessageCommand(),
                `[${selected.type}_id=${selected.id}]`,
                "focus"
            ]).exited;
        })

    const socket = program
        .command("socket");

    socket
        .command("kill")
        .action(async () => {
            
        })

    await program.parseAsync();
} catch (error) {
    if (error instanceof Error) {
        logger.error("Got unhandled error:", error.message);
    }
}
