# Realtime layer

## Decision

**In-process WebSocket server attached to a custom Next.js server.** One Node
process serves HTTP/tRPC and WebSockets on the same port. The hub
(`src/server/realtime/hub.js`) is a module-level singleton in that process.

Chosen over a separate websocket process and over hosted providers because:

- **Zero extra infrastructure.** No Redis, no external service, no second
  deployment unit. At this stage there is no volume to justify any of that.
- **Simplest correctness story.** tRPC mutations call `hub.publish(roomId)`
  directly. No cross-process IPC, no event-sourcing consistency questions.
- **Reconnect is free.** Every broadcast is a full, role-scoped snapshot of
  room state — never a delta log. A client that reconnects simply re-subscribes
  and receives the current state. There is no per-room replay history to keep
  consistent across processes.
- **Server authority is enforced by construction.** Clients only ever receive
  `state` messages; they never send mutations over the socket (a heartbeat and
  a subscribe message are the only client-to-server traffic).

Costs, accepted:

- Deploys as a container / VPS process (`node server.js`), not serverless.
  The play client already ships a service worker and offline page, so it was
  never Vercel-serverless shaped anyway.
- Reverse proxies must forward WebSocket upgrades for `/ws` (`Upgrade:
  websocket` headers).

## Protocol

Client → server:

```json
{ "type": "subscribe", "roomId": "...", "token": "<player.connectionToken>" }
{ "type": "ping" }
```

Server → client:

```json
{ "type": "state", "state": { ...role-scoped snapshot... } }
{ "type": "pong" }
{ "type": "error", "error": "..." }
```

Snapshots are built by `src/server/realtime/snapshot.js`:

- **STAGE** players receive `turn.cardId / content / skinId / nsfw` plus the
  full room view.
- **CONTROLLER** players receive `turn.sequence` and the deck name only.
  Card text is never rendered on controllers — enforced on the server, not by
  client goodwill. The same builder is used by the tRPC `room.state` query, so
  both transports agree.

Presence: `Player.isConnected` is set to true when a socket subscribes and
false when the player's last socket closes. Sockets are pinged every 30s and
terminated when dead, so dropped phones clear presence without waiting for a
TCP timeout.

## How it deploys

```
npm run build   # next build — the app side is a normal build
npm start       # NODE_ENV=production node server.js
```

Single container. The DB is the only external dependency.

## Scaling past one instance

When one process is not enough (or when rooms must survive deploys):

1. Extract the hub into a standalone `ws` process (the hub already has no
   Next.js coupling beyond the snapshot builder, which is plain Prisma).
2. Swap `hub.publish` for a Redis pub/sub channel: tRPC publishes
   `room:{id}:changed`; every hub process re-broadcasts its local sockets.
3. Presence becomes the only DB-write hot path; keep it (it is idempotent and
   cheap), or move `isConnected` into Redis when contention shows up.

The client protocol does not change: subscribe → full snapshot.
