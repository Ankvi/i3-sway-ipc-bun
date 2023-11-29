import { command } from "./messageCommands";
import { Command } from "./types/commands";
import { Container, Root } from "./types/containers";

export function flattenTree(root: Container): Container[] {
    const output: Container[] = [root];
    const queue: Container[] = [root];

    while (queue.length > 0) {
        const current = queue.pop();
        if (!current) {
            break;
        }

        output.push(...current.nodes);
        output.push(...current.floating_nodes);

        queue.push(...current.nodes);
        queue.push(...current.floating_nodes);
    }

    return output;
}
