import { Workspace } from "./common";

export const Command = {
    RunCommand: 0,
    GetWorkspaces: 1,
    Subscribe: 2,
    GetOutputs: 3,
    GetTree: 4,
    GetMarks: 5,
    GetBarConfig: 6,
    GetVersion: 7,
    GetBindingModes: 8,
    GetConfig: 9,
    SendTick: 10,
    Sync: 11,
    GetBindingState: 12
} as const;

export type Command = typeof Command[keyof typeof Command];

type SubscribeReply = {
    success: boolean;
}

type RunCommandReply = {
    success: boolean;
    parse_error?: boolean;
}[];

type GetWorkspacesReply = Workspace[];

export type CommandPayloads = {
    // [Command.RunCommand]: never;
    // [Command.GetWorkspaces]: never;
    [Command.Subscribe]: string[]
    // [Command.GetOutputs]: never;
    // [Command.GetTree]: never;
    // [Command.GetBarConfig]: never;
    // [Command.GetVersion]: never;
    // [Command.GetBindingModes]: never;
    // [Command.GetConfig]: never;
    // [Command.SendTick]: never;
    // [Command.Sync]: never;
    // [Command.GetBindingState]: never;
};

export type CommandReplies = {
    [Command.RunCommand]: RunCommandReply;
    [Command.GetWorkspaces]: GetWorkspacesReply;
    [Command.Subscribe]: SubscribeReply;
}
