import { Output, Workspace, Root } from "./containers";
import { IpcEvent } from "./events";

export const Command = {
    run_command: 0,
    get_workspaces: 1,
    subscribe: 2,
    get_outputs: 3,
    get_tree: 4,
    get_marks: 5,
    get_bar_config: 6,
    get_version: 7,
    get_binding_modes: 8,
    get_config: 9,
    send_tick: 10,
    sync: 11,
    get_binding_state: 12
} as const;

export type Command = typeof Command[keyof typeof Command];

export function getCommandName<T extends Command>(command: T): keyof typeof Command {
    const entry = Object.entries(Command).find(([_, value]) => value === command);
    if (!entry) {
        throw new Error("Could not find command");
    }
    return entry[0] as keyof typeof Command;
}

type SubscribeReply = {
    success: boolean;
}

type RunCommandReply = {
    success: boolean;
    parse_error?: boolean;
}[];

type GetOutputsReply = Output[];

type GetWorkspacesReply = Workspace[];

type GetTreeReply = Root;

export type CommandPayloads = {
    [Command.run_command]: [];
    [Command.get_workspaces]: [];
    [Command.subscribe]: (keyof typeof IpcEvent)[]
    [Command.get_outputs]: [];
    [Command.get_tree]: [];
    [Command.get_marks]: [];
    [Command.get_bar_config]: [];
    [Command.get_version]: [];
    [Command.get_binding_modes]: [];
    [Command.get_config]: [];
    [Command.send_tick]: [];
    [Command.sync]: [];
    [Command.get_binding_state]: [];
};

export type CommandReplies = {
    [Command.run_command]: RunCommandReply;
    [Command.get_workspaces]: GetWorkspacesReply;
    [Command.subscribe]: SubscribeReply;
    [Command.get_outputs]: GetOutputsReply;
    [Command.get_tree]: GetTreeReply;
    [Command.get_marks]: unknown;
    [Command.get_bar_config]: unknown;
    [Command.get_version]: unknown;
    [Command.get_binding_modes]: unknown;
    [Command.get_config]: unknown;
    [Command.send_tick]: unknown;
    [Command.sync]: unknown;
    [Command.get_binding_state]: unknown;
}
