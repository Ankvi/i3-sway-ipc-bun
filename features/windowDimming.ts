import { IpcSocket } from "../IpcSocket";
import { opacity } from "../messageCommands";
import { Command } from "../types/commands";
import { Container, ContainerType, Root } from "../types/common";
import { Content } from "../types/content";
import { IpcEvent, WindowEvent } from "../types/events";

const DIMMED_TRANSPARENCY = 0.8;
const ACTIVE_TRANSPARENCY = 1.0;

export function findFocused(root: Root): Container<ContainerType> | undefined {
    const flattened = flatten(root);
    return flattened.find((x) => x.focused);
}

export function flatten(root: Root): Container<ContainerType>[] {
    const output: Container<ContainerType>[] = [root];
    const queue: Container<ContainerType>[] = [root];

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

class WindowDimming {
    private static _instance?: WindowDimming;

    static async start(ipcSocket: IpcSocket): Promise<WindowDimming> {
        if (!WindowDimming._instance) {
            WindowDimming._instance = new WindowDimming(ipcSocket);
        }
        return WindowDimming._instance;
    }

    private _focused?: Content;

    private constructor(private _ipcSocket: IpcSocket) {
        this._ipcSocket.on(IpcEvent.window, (event) =>
            this.onWindowEvent(event),
        );

        this.initialize();

        this._ipcSocket.onClose(() => this.shutdown());
    }

    private async shutdown() {
        console.log("Resetting all transparencies");
        const tree = await this._ipcSocket.command(Command.get_tree, null);
        const flattened = flatten(tree);
        const content = flattened.filter(
            (x) => x.type === "con" || x.type === "floating_con",
        ) as Content[];
        for (const con of content) {
            opacity(con.pid, ACTIVE_TRANSPARENCY);
        }
    }

    private async initialize() {
        const tree = await this._ipcSocket.command(Command.get_tree, null);
        const flattened = flatten(tree);
        const content = flattened.filter(
            (x) => x.type === "con" || x.type === "floating_con",
        ) as Content[];
        for (const con of content) {
            opacity(con.pid, con.focused ? ACTIVE_TRANSPARENCY : DIMMED_TRANSPARENCY);
        }
    }

    private async onWindowEvent(event: WindowEvent) {
        const tree = await this._ipcSocket.command(Command.get_tree, null);
        // const focused = findFocused(tree);
        const focused = event.container;
        
        if (focused && focused.id !== this._focused?.id) {
            if (this._focused) {
                opacity(this._focused.pid, DIMMED_TRANSPARENCY)
            }
            opacity(focused.pid, ACTIVE_TRANSPARENCY);
            this._focused = event.container;
        } else {
            
        }
    }
}

export function initialize(ipcSocket: IpcSocket) {
    WindowDimming.start(ipcSocket);
}
