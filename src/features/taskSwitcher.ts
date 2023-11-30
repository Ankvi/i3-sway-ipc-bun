import { getMessageCommand } from "../config";
import logger from "../logging";
import { command } from "../messageCommands";
import { Command } from "../types/commands";
import { Content, FloatingContent, isContent } from "../types/containers";
import { flattenTree } from "../utilities";

export async function taskSwitcher() {
    const tree = await command(Command.get_tree);
    const nodes = flattenTree(tree);
    const windows = nodes
        .filter<Content | FloatingContent>(isContent)
        .filter((x) => x.rect.x > 0 && x.rect.y > 0);

    const proc = Bun.spawn(["wofi", "--insensitive", "--show", "dmenu"], {
        stdin: "pipe",
    });

    const names = windows.map((x) => x.name).join("\n");

    proc.stdin.write(names);
    proc.stdin.end();

    await proc.exited;

    const selectedName = (await new Response(proc.stdout).text()).trim();
    logger.debug("Selected name:", selectedName);

    const selected = windows.find((x) => x.name === selectedName);
    if (!selected) {
        logger.info("Nothing was selected");
        return;
    }

    await Bun.spawn([
        ...getMessageCommand(),
        `[${selected.type}_id=${selected.id}]`,
        "focus",
    ]).exited;
}
