import { Container } from "./containers";

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

export const IpcEventNames = Object.keys(IpcEvent);

export interface WindowEvent {
  change: string
  container: Container;
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

export const SocketEvent = {
    WindowFocusChanged: "window-focus-changed",
    // WindowMoved = "window-moved"
    Close: "close"
} as const;

export type SocketEvent = typeof SocketEvent[keyof typeof SocketEvent];

export type SocketEvents = {
    [SocketEvent.WindowFocusChanged]: [Container];
    [SocketEvent.Close]: [];
}

export type SocketEventHandler<T extends SocketEvent> = (payload: SocketEvents[T]) => Promise<void> | void;
