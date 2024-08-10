#!/usr/bin/env bun

import * as commander from "commander";
import type { Provider } from "./types";
import { MonitorSetup, type MonitorSetupArgs } from "./features/monitorSetup";
import { WindowDimming } from "./features/windowDimming";
import logger, { Severity, setMinimumSeverity, severities } from "./logging";
import { taskSwitcher } from "./features/taskSwitcher";
import * as dropdownTerminal from "./features/dropdownTerminal";
import * as screenLocking from "./features/screenLocking";
import * as spotify from "./features/spotify";

declare module "bun" {
	export interface Env {
		IPC_PROVIDER: Provider;
		I3SOCK: string;
		SWAYSOCK: string;
		MINIMUM_SEVERITY: Severity;
		HOME: string;
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
			const found = severities.find((x) => x === value);
			if (found) {
				return found;
			}
			logger.warn(
				`Could not find supported verbosity level "${value}". Setting default level ${Severity.Warning}`,
			);
			return Severity.Warning;
		})
		.hook("preSubcommand", (command) => {
			const options = command.opts<ProgramOptions>();
			Bun.env.IPC_PROVIDER = options.provider ?? "sway";
			setMinimumSeverity(options.verbose);
		});

	const windowDimming = program.command("window-dimming");

	windowDimming.command("start").action(async () => {
		await WindowDimming.start();
	});

	windowDimming.command("stop").action(async () => {
		await WindowDimming.stopExisting();
	});

	const monitorSetup = program
		.command("monitor-setup")
		.option("--setup-file <path>", "Optional path to a monitor setup file");

	monitorSetup.command("load").action(async (args: MonitorSetupArgs) => {
		const monitorSetup = MonitorSetup.initialize(args);
		await monitorSetup.checkAndLoadSetup();
	});

	monitorSetup.command("save-current").action(async (args: MonitorSetupArgs) => {
		const monitorSetup = MonitorSetup.initialize(args);
		await monitorSetup.saveCurrentSetup();
	});

	program.command("task-switcher").action(taskSwitcher);

	const socket = program.command("socket");

	socket.command("kill").action(async () => {});

	program.command("toggle-dropdown-terminal").action(() => dropdownTerminal.toggle());

	program.command("lock-screen").action(() => screenLocking.lock());

	const spotifyCommand = program.command("spotify");

	spotifyCommand.command("move-to-scratchpad").action(async () => {
		await spotify.moveToScratchpad();
	});

	await program.parseAsync();
} catch (error) {
	if (error instanceof Error) {
		logger.error("Got unhandled error:", error.message);
	}
}
