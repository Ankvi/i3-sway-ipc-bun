import { Container } from "./common";

export interface Content extends Container<"con" | "floating_con"> {
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
