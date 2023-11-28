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

type MonitorSetupFileContent = {
    outputs: OutputKey[];
    commands: string[][];
}[];
type MonitorSetupConfig = Map<string, string[][]>;

export interface MonitorSetupArgs {
    setupFile?: string;
}

const SETUP_FOLDER = `${CONFIG_FOLDER}/monitor-setups`;
const DEFAULT_SETUP_FILE = `${CONFIG_FOLDER}/known-monitor-setups.json`;

export class MonitorSetup {
    public static async initialize({
        setupFile,
    }: MonitorSetupArgs): Promise<MonitorSetup> {
        let loadedSetups: MonitorSetupFileContent = [];
        try {
            loadedSetups = await Bun.file(
                setupFile || DEFAULT_SETUP_FILE,
            ).json<MonitorSetupFileContent>();
        } catch {
            logger.info("Could not load setup file");
        }

        return new MonitorSetup(loadedSetups);
    }

    private _setups: MonitorSetupConfig = new Map();

    private constructor(private _loadedSetups: MonitorSetupFileContent) {
        for (const setup of this._loadedSetups) {
            this._setups.set(hashOutputKeys(setup.outputs), setup.commands);
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

        for (const operation of setup) {
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
            setup = outputs.map((output) => {
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
            });
        }
    }
}
