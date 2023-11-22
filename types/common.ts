import { Output } from "./output";

export interface WindowProperties {
    class: string;
    instance: string;
    machine: string;
    title: string;
    transient_for: unknown;
}

export type ContainerType =
    | "root"
    | "workspace"
    | "output"
    | "con"
    | "floating_con"
    | "dockarea";

export interface Nodes<TNode = never, TFloatingNode = never> {
    nodes: TNode[];
    floating_nodes: TFloatingNode[];
}

export interface Container<T extends ContainerType> extends Nodes {
    id: number;
    type: T;
    orientation: string;
    scratchpad_state: string;
    percent: number;
    urgent: boolean;
    marks: string[];
    focused: boolean;
    output: string;
    layout: string;
    workspace_layout: string;
    last_split_layout: string;
    border: string;
    current_border_width: number;
    rect: Rect;
    deco_rect: Rect;
    window_rect: Rect;
    geometry: Rect;
    name: string;
    window_icon_padding: number;
    window: number;
    window_type: string;
    window_properties: WindowProperties;
    focus: number[];
    fullscreen_mode: number;
    sticky: boolean;
    floating: string;
    swallows: unknown[];
}

export type Root = Omit<Container<"root">, keyof Nodes> & Nodes<Output, Output>;
export type Workspace = Container<"workspace">;

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
