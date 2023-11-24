import { IpcSocket } from "../IpcSocket";
import { getMessageCommand } from "../config";
import logger from "../logging";

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

export class MonitorSetup {
    public static async initialize(ipcSocket: IpcSocket) {
        const loadedSetups = await Bun.file(
            `${import.meta.dir}/known-setups.json`,
        ).json<MonitorSetupFileContent>();

        const monitorSetups: MonitorSetupConfig = new Map();
        for (const setup of loadedSetups) {
            monitorSetups.set(hashOutputKeys(setup.outputs), setup.commands);
        }
        return new MonitorSetup(monitorSetups, ipcSocket);
    }

    private constructor(
        private _setups: MonitorSetupConfig,
        private _socket: IpcSocket,
    ) {}

    async checkAndLoadSetup() {
        const outputs = await this._socket.getOutputs();
        const outputKeys = outputs
            .map<OutputKey>(({ make, model, serial }) => ({
                make,
                model,
                serial,
            }));

        const setupKey = hashOutputKeys(outputKeys);

        const setup = this._setups.get(setupKey);
        if (!setup) {
            logger.info("Could not find any setups");
            return;
        }

        for (const operation of setup) {
            const command = [...getMessageCommand(), "output", ...operation];
            const proc = Bun.spawn(command);
            await proc.exited;
        }
    }
}
