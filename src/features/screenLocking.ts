import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { command } from "../messageCommands";
import { Command } from "../types/commands";
import logger from "../logging";

type Resolution = `${number}x${number}`;
const loadedWallpapers = new Map<Resolution, string[]>();

const wallpaperFolder = join(Bun.env.HOME, "Pictures", "wallpapers");

export async function lock() {
	logger.debug("Locking screen");

	const lockCommand = ["swaylock", "-f"];

	const lockScreenImages: { [key: Resolution]: string } = {};

	const outputs = await command(Command.get_outputs);
	for (const output of outputs) {
		if (!(output.rect.width && output.rect.height)) {
			continue;
		}

		const resolution: Resolution = `${output.rect.width}x${output.rect.height}`;
		if (lockScreenImages[resolution]) {
			logger.debug("Already selected an image for resolution:", resolution);
			lockCommand.push("--image", lockScreenImages[resolution]);
		}

		if (!loadedWallpapers.has(resolution)) {
			const folder = join(wallpaperFolder, resolution);
			logger.debug("Checking folder:", folder);

			const folderContent = await readdir(folder, {
				withFileTypes: true,
			});
			const wallpaperNames = folderContent.filter((x) => !x.isDirectory());
			loadedWallpapers.set(
				resolution,
				wallpaperNames.map((wallpaper) => join(folder, wallpaper.name)),
			);
		}

		const wallpapers = loadedWallpapers.get(resolution) ?? [];
		if (!wallpapers.length) {
			logger.info("Could not find any wallpapers for the given resolution");
			return;
		}

		const randomIndex = Math.floor(Math.random() * wallpapers.length);
		lockScreenImages[resolution] = `${output.name}:${wallpapers[randomIndex]}`;
		lockCommand.push("--image", lockScreenImages[resolution]);
	}

	await Bun.spawn(lockCommand).exited;
}
