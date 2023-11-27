import { unlinkSync, existsSync } from "node:fs";
import { IpcSocket } from "../IpcSocket";
import logger from "../logging";
import { commandSync, opacity } from "../messageCommands";
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

export class WindowDimming {
    private static _instance?: WindowDimming;

    static async start() {
        if (Bun.env.IPC_PROVIDER !== "sway") {
            throw new Error("Window dimming is only supported in Sway. For window dimming in i3, check out picom or compton");
        }
        const ipcSocket = await IpcSocket.getSocket();
        if (!WindowDimming._instance) {
            const lockFile = Bun.file(WINDOW_DIMMING_LOCK_FILE);
            if (await lockFile.exists()) {
                const pid = await lockFile.text();
                logger.warn(
                    `Found existing window dimming script with pid: '${pid}'. Killing it and restarting`,
                );
                await Bun.spawn(["kill", "-TERM", pid]).exited;
            }
            WindowDimming._instance = new WindowDimming(ipcSocket);
        }
        await ipcSocket.process();
    }

    private _focused?: Content | FloatingContent;

    private constructor(private _ipcSocket: IpcSocket) {
        this._ipcSocket.on("window-focus-changed", (event) =>
            this.onWindowEvent(event),
        );

        this.initialize();

        this._ipcSocket.on("end", () => this.shutdown());
    }

    private getContent(): (Content | FloatingContent)[] {
        const tree = commandSync(Command.get_tree);
        const flattened = flatten(tree);
        const content = flattened.filter<Content | FloatingContent>(isContent);
        return content;
    }

    private shutdown() {
        logger.info("Resetting all transparencies");
        const content = this.getContent();
        for (const con of content) {
            opacity(con, ACTIVE_TRANSPARENCY);
        }

        if (existsSync(WINDOW_DIMMING_LOCK_FILE)) {
            logger.info("Deleting window dimming lock file");
            unlinkSync(WINDOW_DIMMING_LOCK_FILE);
        }
    }

    private async initialize() {
        const pid = process.pid.toString();
        logger.info("Initializing window dimming with PID:", pid);
        const lockFile = Bun.file(WINDOW_DIMMING_LOCK_FILE);
        await Bun.write(lockFile, pid);
        const content = this.getContent();
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
