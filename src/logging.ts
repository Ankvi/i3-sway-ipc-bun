import pkg from "../package.json" with { type: "json" };
import { appendFile, mkdir } from "node:fs/promises";

const PID = process.pid;

const LOG_FOLDER = `${Bun.env.HOME}/.local/logs`;
const LOG_FILE_LOCATION = `${LOG_FOLDER}/${pkg.name}.log`;
const LOG_FILE = Bun.file(LOG_FILE_LOCATION);

export const Severity = {
    Debug: "debug",
    Information: "info",
    Warning: "warn",
    Error: "error",
} as const;

export type Severity = typeof Severity[keyof typeof Severity];

const severityIndices = [Severity.Debug, Severity.Information, Severity.Warning, Severity.Error] as const;

function consoleLog(severity: Severity, payload: string) {
    const minimumSeverityIndex = severityIndices.findIndex(x => x === (Bun.env.MINIMUM_SEVERITY ?? Severity.Warning));
    const severityIndex = severityIndices.findIndex(x => x === severity);
    if (minimumSeverityIndex > severityIndex) {
        return;
    }
    
    switch (severity) {
        case "error":
            console.error(payload);
            break;
        case "warn":
            console.warn(payload);
            break;
        case "info":
            console.info(payload);
            break;
        case "debug":
            console.debug(payload);
            break;
        default:
            console.log(payload);
            break;
    }
}

function getTimestamp(): [string, string] {
    const now = new Date();
    const date = now.toLocaleDateString("nb-NO");
    const time = now.toLocaleTimeString("nb-NO");
    return [date, time];
}

export async function log(severity: Severity, ...args: string[]) {
    const [date, time] = getTimestamp();

    const payload = args.join(" ");
    const parts = [severity, PID, date, time, payload];
    const message = parts.join("\t");

    consoleLog(severity, payload);

    if (await LOG_FILE.exists()) {
        await appendFile(LOG_FILE_LOCATION, `${message}\n`);
        return;
    }

    await mkdir(LOG_FOLDER);
    await Bun.write(LOG_FILE, `${message}\n`);
}

export async function info(...args: string[]) {
    await log("info", ...args);
}

export async function warn(...args: string[]) {
    await log("warn", ...args);
}

export async function error(...args: string[]) {
    await log("error", ...args);
}

export async function debug(...args: string[]) {
    await log("debug", ...args);
}


type Logger = {
    log: typeof log;
    info: typeof info;
    warn: typeof warn;
    error: typeof error;
    debug: typeof debug;
}

const logger: Logger = {
    log,
    info,
    warn,
    error,
    debug
};

export default logger;
