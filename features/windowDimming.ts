import { unlink } from "node:fs/promises";
import { IpcSocket } from "../IpcSocket";
import logger from "../logging";
import { opacity } from "../messageCommands";
import { Command } from "../types/commands";
import {
    Container,
    Content,
    FloatingContent,
    Root,
    isContent,
} from "../types/containers";

const DIMMED_TRANSPARENCY = 0.8;
const ACTIVE_TRANSPARENCY = 1.0;

export function findFocused(root: Root): Container | undefined {
    const flattened = flatten(root);
    return flattened.find((x) => x.focused);
}

export function flatten(root: Root): Container[] {
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

const WINDOW_DIMMING_LOCK_FILE = `${import.meta.dir}/.lock`;
const lockFile = Bun.file(WINDOW_DIMMING_LOCK_FILE);
logger.info("Using lock file:", WINDOW_DIMMING_LOCK_FILE);

export class WindowDimming {
    private static _instance?: WindowDimming;

    static async start(ipcSocket: IpcSocket): Promise<WindowDimming> {
        if (!WindowDimming._instance) {
            if (await lockFile.exists()) {
                const pid = await lockFile.text();
                logger.warn(
                    `Found existing window dimming script with pid: '${pid}'. Killing it and restarting`,
                );
                await Bun.spawn(["kill", "-TERM", pid]).exited;
            }
            WindowDimming._instance = new WindowDimming(ipcSocket);
        }
        return WindowDimming._instance;
    }

    private _focused?: Content | FloatingContent;

    private constructor(private _ipcSocket: IpcSocket) {
        this._ipcSocket.on("window-focus-changed", (event) =>
            this.onWindowEvent(event),
        );

        this.initialize();

        this._ipcSocket.on("close", () => this.shutdown());
    }

    private async getContent(): Promise<(Content | FloatingContent)[]> {
        const tree = await this._ipcSocket.command(Command.get_tree, null);
        const flattened = flatten(tree);
        const content = flattened.filter<Content | FloatingContent>(isContent);
        return content;
    }

    private async shutdown() {
        logger.info("Resetting all transparencies");
        const content = await this.getContent();
        for (const con of content) {
            opacity(con, ACTIVE_TRANSPARENCY);
        }
        if (await lockFile.exists()) {
            await unlink(WINDOW_DIMMING_LOCK_FILE);
        }
    }

    private async initialize() {
        logger.info("Initializing window dimming");
        await Bun.write(lockFile, process.pid.toString());
        const content = await this.getContent();
        for (const con of content) {
            opacity(
                con,
                con.focused ? ACTIVE_TRANSPARENCY : DIMMED_TRANSPARENCY,
            );
        }
    }

    private async onWindowEvent(container: Container) {
        const focused = container;

        if (!isContent(focused)) {
            logger.warn(
                "onWindowEvent container was not 'con' or 'floating_con'. Actual value:",
                JSON.stringify(focused),
            );
            return;
        }

        if (focused && focused.id !== this._focused?.id) {
            if (this._focused) {
                opacity(this._focused, DIMMED_TRANSPARENCY);
            }
            opacity(focused, ACTIVE_TRANSPARENCY);
            this._focused = focused;
        } else {
        }
    }
}
