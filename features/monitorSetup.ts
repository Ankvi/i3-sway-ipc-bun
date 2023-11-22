import { IpcSocket } from "../IpcSocket";
import { getMessageCommand } from "../config";

type OutputKey = {
    make: string;
    model: string;
    serial: string;
};

const createOutputKeyString = (key: OutputKey) => `${key.make}.${key.model}.${key.serial}`;

function sortOutputKeys(a: OutputKey, b: OutputKey) {
    const keyA = createOutputKeyString(a);
    const keyB = createOutputKeyString(b);
    if (keyA < keyB) {
        return -1;
    } else if (keyA > keyB) {
        return 1;
    }
    return 0;
}

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

    async initialize() {
        const outputs = await this._socket.getOutputs();
        const outputKeys = outputs
            .map<OutputKey>(({ make, model, serial }) => ({
                make,
                model,
                serial,
            }));

        const setupKey = hashOutputKeys(outputKeys);

        console.log(
            "Created output keys for current available outputs: ",
            outputKeys,
        );

        const setup = this._setups.get(setupKey);
        if (!setup) {
            console.log("Could not find any setups");
            return;
        }

        for (const operation of setup) {
            const command = [...getMessageCommand(), "output", ...operation];
            console.log("Running output operation: ", command);
            const proc = Bun.spawn(command);
            await proc.exited;
            const response = await new Response(proc.stdout).text();
            console.log(response);
        }
    }
}
