import { IpcSocket } from "../IpcSocket";
import { Command } from "../types/command";
import { Container } from "../types/common";
import { IpcEvent, WindowEvent } from "../types/event";

function findFocused(root: Container): Container | undefined {
    const queue = [root];
    let current: Container | undefined;
    while (queue.length > 0) {
        current = queue.pop();
        if (!current) {
            break;
        }
        if (current.focused) {
            return current;
        }
        queue.push(...current.nodes);
        queue.push(...current.floating_nodes);
    }
}

class WindowDimming {
    private static _instance?: WindowDimming;

    static async start(ipcSocket: IpcSocket): Promise<WindowDimming> {
        if (!WindowDimming._instance) {
            const tree = await ipcSocket.command(Command.get_tree, null);
            const focused = findFocused(tree);


            WindowDimming._instance = new WindowDimming(ipcSocket);
        }
        return WindowDimming._instance;
    }

    private _focused?: Container;


    private constructor(private _ipcSocket: IpcSocket) {
        this._ipcSocket.on(IpcEvent.window, (event) => this.onWindowEvent(event));
    }

    private onWindowEvent(event: WindowEvent) {
        this._focused = event.container;
        
    }

}

export function initialize(ipcSocket: IpcSocket) {
    WindowDimming.start(ipcSocket);
}
