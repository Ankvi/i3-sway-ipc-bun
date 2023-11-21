import { Container, Root } from "../types/common";

export class Node {
    public parent?: Node;
    public children: Node[] = [];

    private constructor(container: Container, parent?: Node) {
        this.parent = parent;
        for (const child of container.nodes) {

        }
    }

    public static createTree(root: Root): Node {
        return new Node(root);
    }
}
