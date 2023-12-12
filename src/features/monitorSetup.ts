import { readFileSync } from "node:fs";
import { CONFIG_FOLDER, getMessageCommand } from "../config";
import logger from "../logging";
import { command } from "../messageCommands";
import { Command } from "../types/commands";

type OutputKey = {
    make: string;
    model: string;
    serial: string;
};

const createOutputKeyString = (key: OutputKey) =>
    `${key.make}.${key.model}.${key.serial}`;

function hashOutputKeys(keys: OutputKey[]): string {
    const keyStrings = keys.map((x) => createOutputKeyString(x));
    const sorted = keyStrings.sort().join("-");
    const hashed = Bun.hash(sorted);
    return hashed.toString();
}

type MonitorSetupValue = {
    outputs: OutputKey[];
    commands: string[][];
};

type MonitorSetupFileContent = ({
    key: string;
} & MonitorSetupValue)[];
type MonitorSetupConfig = Map<string, MonitorSetupValue>;

export interface MonitorSetupArgs {
    setupFile?: string;
}

const SETUP_FOLDER = `${CONFIG_FOLDER}/monitor-setups`;
const DEFAULT_SETUP_FILE = `${CONFIG_FOLDER}/known-monitor-setups.json`;

export class MonitorSetup {
    public static initialize({
        setupFile,
    }: MonitorSetupArgs): MonitorSetup {
        return new MonitorSetup(setupFile || DEFAULT_SETUP_FILE);
    }

    private _loadedSetups: MonitorSetupFileContent;
    private _setups: MonitorSetupConfig = new Map();

    private constructor(private _setupFilePath: string) {
        const content = readFileSync(this._setupFilePath, {
            encoding: "utf8"
        });
        this._loadedSetups = JSON.parse(content);
        for (const { key, outputs, commands } of this._loadedSetups) {
            this._setups.set(key || hashOutputKeys(outputs), {
                outputs,
                commands,
            });
        }
    }

    async checkAndLoadSetup() {
        const outputs = await command(Command.get_outputs);
        const outputKeys = outputs.map<OutputKey>(
            ({ make, model, serial }) => ({
                make,
                model,
                serial,
            }),
        );

        const setupKey = hashOutputKeys(outputKeys);

        const setup = this._setups.get(setupKey);
        if (!setup) {
            logger.warn("Could not find any setups");
            return;
        }

        logger.debug("Found setup. Running commands");

        for (const operation of setup.commands) {
            const command = [...getMessageCommand(), "output", ...operation];
            const proc = Bun.spawn(command);
            await proc.exited;
        }
    }

    async saveCurrentSetup() {
        const outputs = await command(Command.get_outputs);
        const outputKeys = outputs.map<OutputKey>(
            ({ make, model, serial }) => ({
                make,
                model,
                serial,
            }),
        );

        const setupKey = hashOutputKeys(outputKeys);
        let setup = this._setups.get(setupKey);
        if (!setup) {
            setup = {
                outputs: outputKeys,
                commands: outputs.map((output) => {
                    const name = `"${output.make} ${output.model} ${output.serial}"`;
                    if (!output.active) {
                        return [name, "disable"];
                    }

                    return [
                        name,
                        "pos",
                        output.rect.x.toString(),
                        output.rect.y.toString(),
                    ];
                }),
            };
            this._setups.set(setupKey, setup);
            const content = Array.from(this._setups, ([key, value]) => ({ key, ...value }));
            await Bun.write(this._setupFilePath, JSON.stringify(content, null, 4));
        }
    }
}
