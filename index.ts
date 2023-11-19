import { SwaySocket } from "./SwaySocket";

const swaySocket = await SwaySocket.getSocket();

await swaySocket.process();
