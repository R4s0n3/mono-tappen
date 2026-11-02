// @ts-nocheck
/**
 * Custom Next.js server: serves the app AND the room realtime layer on one port.
 *
 * WebSocket connections arrive at `/ws`. The hub lives in this process, so
 * tRPC mutations broadcast by calling it directly. See docs/realtime.md.
 */
import { createServer } from "http";
import next from "next";
import { WebSocketServer } from "ws";
import { hub } from "./src/server/realtime/hub.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  handle(req, res);
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    hub.attach(ws);
  });
});

server.listen(port, hostname, () => {
  console.log(`play.tappen.app ready on http://${hostname}:${port} (${dev ? "dev" : "prod"})`);
});
