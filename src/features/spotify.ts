import { $ } from "bun";
import { command } from "../messageCommands";
import { Command } from "../types/commands";
import { flattenTree } from "../utilities";
import { type Content, type FloatingContent, isContent } from "../types/containers";
import { getMessageCommand } from "../config";

export async function moveToScratchpad() {
    const tree = await command(Command.get_tree);
    const flattened = flattenTree(tree);
    const content = flattened.filter<Content | FloatingContent>(isContent);
    const spotifyNode = content.find(x => x.name.includes("Spotify"));
    if (!spotifyNode) {
        return;
    }
    await $`swaymsg [pid="${spotifyNode.pid}"] move to scratchpad`;
    await $`swaymsg scratchpad show`;
}
