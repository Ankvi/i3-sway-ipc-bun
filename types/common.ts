export type Workspace = {
    num: number;
    name: string;
    visible: boolean;
    focused: boolean;
    urgent: boolean;
    output: string;
    rect: Rect;
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
