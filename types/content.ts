import { Container } from "./common";

export interface Content extends Container {
    type: "con";
}

export interface FloatingContent extends Container {
    type: "floating_con";
    nodes: Content[];
}
