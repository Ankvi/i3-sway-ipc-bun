import { getMessageCommand } from "../config";
import * as log from "../logging";
import { command } from "../messageCommands";
import { Command } from "../types/commands";
import { type Content, type FloatingContent, isContent } from "../types/containers";
import { flattenTree } from "../utilities";

export async function toggle(terminalAppId = "alacritty-dropdown") {
	const tree = await command(Command.get_tree);
	const flattened = flattenTree(tree);
	const content = flattened.filter<Content | FloatingContent>(isContent);
	const dropdownTerminal = content.find((node) => node.app_id === terminalAppId);

	if (!dropdownTerminal) {
		log.error(`No dropdown terminal with name ${terminalAppId} found in content:`);
		log.error(
			JSON.stringify(
				content.map((x) => ({
					id: x.id,
					app_id: x.app_id,
					name: x.name,
				})),
				null,
				4,
			),
		);
		return;
	}

	if (dropdownTerminal.visible) {
		log.info("Closing terminal");
		await Bun.spawn([...getMessageCommand(), "scratchpad", "show"]).exited;
		return;
	}

	const focused = content.find((node) => node.focused);
	if (!focused) {
		log.warn("No focused content. Cannot find correct output");
		return;
	}

	if (!focused.parent) {
		log.warn("Focused content doesn't have a parent node.");
		return;
	}

	const workspace = flattened.find((node) => node.id === focused.parent);
	if (!workspace) {
		log.warn("Parent of focused node doesn't exist apparently");
		return;
	}

	const output = flattened.find((node) => node.id === workspace.id);
	if (!output) {
		log.warn("Workspace is not assigned to an output");
		return;
	}

	const newWidth = Math.floor(output.rect.width * 0.8);
	const newHeight = Math.floor(output.rect.height * 0.8);

	if (!(dropdownTerminal.rect.width === newWidth && dropdownTerminal.rect.height === newHeight)) {
		log.info(
			`Updating terminal size. Old: ${dropdownTerminal.rect.width}x${dropdownTerminal.rect.height}. New: ${newWidth}x${newHeight}`,
		);
		const resizeCommand = Bun.spawn([
			...getMessageCommand(),
			`[app_id=${terminalAppId}]`,
			"resize",
			"set",
			newWidth.toString(),
			newHeight.toString(),
		]);

		await resizeCommand.exited;
	}

	log.info("Opening terminal");
	await Bun.spawn([...getMessageCommand(), "scratchpad", "show"]).exited;
}
