import pkg from "../package.json" with { type: "json" };

import { Provider } from "./types";

export const CONFIG_FOLDER = `${Bun.env.HOME}/.config/${pkg.name}`;

export const COMMAND_CONFIG = {
    i3: ["i3-msg"],
    sway: ["swaymsg", "--raw"],
} as const;

export function getMessageCommand() {
    const provider = Bun.env.IPC_PROVIDER as Provider;
    return COMMAND_CONFIG[provider];
}

export const SOCKET_ENV_VAR_CONFIG = {
    sway: Bun.env.SWAYSOCK,
    i3: Bun.env.I3SOCK,
} as const;

export function getSocketPath() {
    const provider = Bun.env.IPC_PROVIDER as Provider;
    return SOCKET_ENV_VAR_CONFIG[provider];
}
