import { Container } from "./types/containers";

export function flattenTree(root: Container): Container[] {
    const output: Container[] = [root];
    const queue: Container[] = [root];

    while (queue.length > 0) {
        const current = queue.pop();
        if (!current) {
            break;
        }

        output.push(...current.nodes.map((node) => ({
            ...node,
            parent: current.id
        })));
        output.push(...current.floating_nodes.map((node) => ({
            ...node,
            parent: current.id
        })));

        queue.push(...current.nodes);
        queue.push(...current.floating_nodes);
    }

    return output;
}

