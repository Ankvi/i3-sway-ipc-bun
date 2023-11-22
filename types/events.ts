import { Content } from "./content";

export const IpcEvent = {
    workspace: 0,
    output: 1,
    mode: 2,
    window: 3,
    bar_config_update: 4,
    binding: 5,
    shutdown: 6,
    tick: 7,
} as const;

export type IpcEvent = typeof IpcEvent[keyof typeof IpcEvent];


export interface WindowEvent {
  change: string
  container: Content 
}

export type IpcEventPayloads = {
    [IpcEvent.workspace]: Record<string, unknown>;
    [IpcEvent.window]: WindowEvent;
    [IpcEvent.output]: Record<string, unknown>;
    [IpcEvent.mode]: Record<string, unknown>;
    [IpcEvent.bar_config_update]: Record<string, unknown>;
    [IpcEvent.binding]: Record<string, unknown>;
    [IpcEvent.shutdown]: Record<string, unknown>;
    [IpcEvent.tick]: Record<string, unknown>;
}

export type IpcEventHandler<T extends IpcEvent> = (payload: IpcEventPayloads[T]) => (void | Promise<void>);