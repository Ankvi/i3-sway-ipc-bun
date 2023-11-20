import { IpcSocket } from "../IpcSocket";
import { IpcEvent, WindowEvent } from "../types/event";

class WindowDimming {
    private static _instance?: WindowDimming;

    private constructor(private _ipcSocket: IpcSocket) {
        this._ipcSocket.on(IpcEvent.window, (event) => this.onWindowEvent(event));
    }

    private onWindowEvent(event: WindowEvent) {

    }

    static start(ipcSocket: IpcSocket): WindowDimming {
        if (!WindowDimming._instance) {
            WindowDimming._instance = new WindowDimming(ipcSocket);
        }
        return WindowDimming._instance;
    }
}

export function initialize(ipcSocket: IpcSocket) {
    WindowDimming.start(ipcSocket);
}
