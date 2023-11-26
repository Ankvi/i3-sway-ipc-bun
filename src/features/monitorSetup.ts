import { CONFIG_FOLDER, getMessageCommand } from "../config";
import logger from "../logging";
import { command } from "../messageCommands";
import { Command } from "../types/commands";

type OutputKey = {
    make: string;
    model: string;
    serial: string;
};

const createOutputKeyString = (key: OutputKey) => `${key.make}.${key.model}.${key.serial}`;

function hashOutputKeys(keys: OutputKey[]): string {
    const keyStrings = keys.map(x => createOutputKeyString(x));
    const sorted = keyStrings.sort().join("-");
    const hashed = Bun.hash(sorted);
    return hashed.toString();
}

type MonitorSetupFileContent = {
    outputs: OutputKey[],
    commands: string[][]
}[];
type MonitorSetupConfig = Map<string, string[][]>;

export interface MonitorSetupArgs {
    setupFile?: string;
}

const DEFAULT_SETUP_FILE = `${CONFIG_FOLDER}/known-monitor-setups.json`;

export class MonitorSetup {
    public static async initialize({ setupFile }: MonitorSetupArgs) {
        const monitorSetups: MonitorSetupConfig = new Map();
        try {
            const loadedSetups = await Bun.file(
                setupFile || DEFAULT_SETUP_FILE
            ).json<MonitorSetupFileContent>();

            for (const setup of loadedSetups) {
                monitorSetups.set(hashOutputKeys(setup.outputs), setup.commands);
            }
        } catch {
            logger.info("Could not load setup file");
        }

        return new MonitorSetup(monitorSetups);
    }

    private constructor(
        private _setups: MonitorSetupConfig,
    ) {}

    async checkAndLoadSetup() {
        const outputs = await command(Command.get_outputs);
        const outputKeys = outputs
            .map<OutputKey>(({ make, model, serial }) => ({
                make,
                model,
                serial,
            }));

        const setupKey = hashOutputKeys(outputKeys);

        const setup = this._setups.get(setupKey);
        if (!setup) {
            logger.debug("Could not find any setups");
            return;
        }

        for (const operation of setup) {
            const command = [...getMessageCommand(), "output", ...operation];
            const proc = Bun.spawn(command);
            await proc.exited;
        }
    }
}
