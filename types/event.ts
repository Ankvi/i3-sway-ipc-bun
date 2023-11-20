import { Container } from "./common";

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
  container: Container
}
