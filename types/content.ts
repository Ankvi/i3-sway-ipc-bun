import { Container } from "./common";

export interface Content extends Container {
    type: "con";
    pid: number;
    app_id: string;
    visible: boolean;
    max_render_time: number;
    shell: string;
    inhibit_idle: boolean;
    idle_inhibitors: {
        user: string;
        application: string;
    }
}

export interface FloatingContent extends Container {
    type: "floating_con";
    nodes: Content[];
}
