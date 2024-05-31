import { unlinkSync, existsSync, mkdirSync } from "node:fs";
import { IpcSocket } from "../IpcSocket";
import logger from "../logging";
import { commandSync } from "../messageCommands";
import { Command } from "../types/commands";
import {
    type Container,
    type Content,
    type FloatingContent,
    type Root,
    isContent,
} from "../types/containers";
import { RUNTIME_FOLDER, CONFIG_FOLDER, getMessageCommand } from "../config";
import { flattenTree } from "../utilities";

const DIMMED_TRANSPARENCY = 0.9;
const ACTIVE_TRANSPARENCY = 1.0;

const WINDOW_DIMMING_LOCK_FILE = `${RUNTIME_FOLDER}/window-dimming.lock`;
const WINDOW_DIMMING_CONFIG_FOLDER = `${CONFIG_FOLDER}/window-dimming`;

if (!existsSync(WINDOW_DIMMING_CONFIG_FOLDER)) {
    mkdirSync(WINDOW_DIMMING_CONFIG_FOLDER);
}

export function findFocused(root: Root): Container | undefined {
    const flattened = flattenTree(root);
    return flattened.find((x) => x.focused);
}

export class WindowDimming {
    private static _instance?: WindowDimming;

    static async start() {
        if (Bun.env.IPC_PROVIDER !== "sway") {
            throw new Error(
                "Window dimming is only supported in Sway. For window dimming in i3, check out picom or compton",
            );
        }
        const ipcSocket = await IpcSocket.getSocket();
        if (!WindowDimming._instance) {
            await WindowDimming.stopExisting();

            const pid = process.pid.toString();
            logger.info("Initializing window dimming with PID:", pid);
            const lockFile = Bun.file(WINDOW_DIMMING_LOCK_FILE);
            await Bun.write(lockFile, pid);

            WindowDimming._instance = new WindowDimming(ipcSocket);
        }
        await ipcSocket.process();
    }

    static async stopExisting() {
        const lockFile = Bun.file(WINDOW_DIMMING_LOCK_FILE);
        if (await lockFile.exists()) {
            const pid = await lockFile.text();
            if (parseInt(pid) === process.pid) {
                logger.warn("PID is this process. We don't kill ourselves.... right?")
                return;
            }
            logger.warn(
                `Found existing window dimming script with pid: '${pid}'. Killing it and restarting`,
            );
            await Bun.spawn(["kill", "-USR1", pid]).exited;
        }
    }

    private _focused?: Content | FloatingContent;

    private constructor(private _ipcSocket: IpcSocket) {
        this._ipcSocket.on("window-focus-changed", (event) =>
            this.onWindowEvent(event),
        );

        this._ipcSocket.on("end", (signal) => this.shutdown(signal));

        this.initialize();
    }

    private getContent(): (Content | FloatingContent)[] {
        const tree = commandSync(Command.get_tree);
        const flattened = flattenTree(tree);
        const content = flattened.filter<Content | FloatingContent>(isContent);
        return content;
    }

    private shutdown(signal?: Signals) {
        logger.info("Resetting all transparencies");
        const content = this.getContent();
        for (const con of content) {
            this.setDimmed(con, false);
        }

        if (signal === "SIGUSR1") {
            logger.info(
                "Shutdown triggered by another window dimming process. No need to delete lock file",
            );
            return;
        }

        if (existsSync(WINDOW_DIMMING_LOCK_FILE)) {
            logger.info("Deleting window dimming lock file");
            unlinkSync(WINDOW_DIMMING_LOCK_FILE);
        }
    }

    private initialize() {
        const content = this.getContent();
        for (const con of content) {
            this.setDimmed(con, !con.focused);
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
                this.setDimmed(this._focused, true);
            }
            this.setDimmed(focused, false);
            this._focused = focused;
        } else {
        }
    }
    private async setDimmed(
        content: Content | FloatingContent,
        dimmed: boolean,
    ) {
        const value = dimmed ? DIMMED_TRANSPARENCY : ACTIVE_TRANSPARENCY;
        const command = [
            ...getMessageCommand(),
            `[con_id=${content.id}]`,
            "opacity",
            value.toFixed(1),
        ];
        const proc = Bun.spawn(command);
        await proc.exited;
    }
}
