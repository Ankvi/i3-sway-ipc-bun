import { Container, Nodes, Workspace } from "./common";

export type Outputs = Output[];

export interface Output extends Omit<Container<"output">, keyof Nodes>,  Nodes<Workspace, Workspace> {
    primary: boolean;
    make: string;
    model: string;
    serial: string;
    modes: Mode[];
    non_desktop: boolean;
    active: boolean;
    dpms: boolean;
    power: boolean;
    scale: number;
    scale_filter: string;
    transform: string;
    adaptive_sync_status: string;
    current_workspace: string;
    current_mode: CurrentMode;
    max_render_time: number;
    subpixel_hinting: string;
}

export interface Mode {
    width: number;
    height: number;
    refresh: number;
    picture_aspect_ratio: string;
}

export interface CurrentMode {
    width: number;
    height: number;
    refresh: number;
    picture_aspect_ratio: string;
}
