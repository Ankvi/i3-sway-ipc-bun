import { Container, Rect } from "./common"

export type Outputs = Output[]

export interface Output {
  id: number
  type: string
  orientation: string
  percent: number
  urgent: boolean
  marks: string[]
  layout: string
  border: string
  current_border_width: number
  rect: Rect
  deco_rect: Rect
  window_rect: Rect
  geometry: Rect
  name: string
  window: Container; 
  nodes: Container[]
  floating_nodes: Container[]
  focus: number[]
  fullscreen_mode: number
  sticky: boolean
  primary: boolean
  make: string
  model: string
  serial: string
  modes: Mode[]
  non_desktop: boolean
  active: boolean
  dpms: boolean
  power: boolean
  scale: number
  scale_filter: string
  transform: string
  adaptive_sync_status: string
  current_workspace: string
  current_mode: CurrentMode
  max_render_time: number
  focused: boolean
  subpixel_hinting: string
}

export interface Mode {
  width: number
  height: number
  refresh: number
  picture_aspect_ratio: string
}

export interface CurrentMode {
  width: number
  height: number
  refresh: number
  picture_aspect_ratio: string
}

