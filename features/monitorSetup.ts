import { IpcSocket } from "../IpcSocket";
import { IpcEvent } from "../types/events";

export function initialize(ipcSocket: IpcSocket) {
    ipcSocket.on(IpcEvent.output, (payload) => console.log("Received OUTPUT event: ", payload));
} 
