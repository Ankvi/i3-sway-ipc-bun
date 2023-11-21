import { Container } from "./common";
import { Output } from "./output";

export interface Root extends Container {
    type: "root";
    nodes: Output[];
}
