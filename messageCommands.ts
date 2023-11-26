import { getMessageCommand } from "./config";
import logger from "./logging";
import {
    Command,
    CommandPayloads,
    CommandReplies,
    getCommandName,
} from "./types/commands";
import { Content, FloatingContent } from "./types/containers";

export async function opacity(
    content: Content | FloatingContent,
    value: number,
) {
    if (value < 0 || value > 1) {
        throw new Error("Value is not between 0 and 1");
    }
    const command = [
        ...getMessageCommand(),
        `[con_id=${content.id}]`,
        "opacity",
        value.toFixed(1),
    ];
    const proc = Bun.spawn(command);
    await proc.exited;
}

export async function command<T extends Command>(
    command: T,
    ...payload: CommandPayloads[T]
): Promise<CommandReplies[T]> {
    const msgCommand = getMessageCommand();

    const commandName = getCommandName(command);

    const msgArgs: string[] = [...msgCommand, "-t", commandName];
    if (payload) {
        msgArgs.push("-m", JSON.stringify(payload));
    }

    const proc = Bun.spawn(msgArgs, {
        stderr: "pipe",
    });
    const exitCode = await proc.exited;
    if (exitCode) {
        const error = await new Response(proc.stderr).text();
        logger.error(error);
        throw new Error(error);
    }

    const response = await new Response(proc.stdout).json<CommandReplies[T]>();
    return response;
}

export function commandSync<T extends Command>(
    command: T,
    ...payload: CommandPayloads[T]
): CommandReplies[T] {
    const msgCommand = getMessageCommand();

    const commandName = getCommandName(command);

    const msgArgs: string[] = [...msgCommand, "-t", commandName];
    if (payload.length) {
        msgArgs.push("-m", JSON.stringify(payload));
    }

    const proc = Bun.spawnSync(msgArgs, {
        stderr: "pipe"
    });
    
    const response = proc.stdout.toString();
    return JSON.parse(response);
}
