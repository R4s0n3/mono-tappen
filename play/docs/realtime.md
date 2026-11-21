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
- **Server authority is enforced by construction.** The turn changes only
  through tRPC (`room.advance`), and only the stage host may call it. The
  socket also carries one ephemeral message, `card.transform`, which is a
  pose (where the card sits), not the next card. Any joined player may drag.
  It is not written to the database.

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
{
  "type": "card.transform",
  "x": 0.62,
  "y": 0.48,
  "rotation": 4.2,
  "flipped": false,
  "dragging": true,
  "sequence": 3
}
```

Any joined player may send `card.transform`. `x` and `y` are normalized to
the shared card area (`0..1`, with `0.5, 0.5` at rest). The deal-in and the
host's swipe fly-out may leave that box; the server clamps both axes to
`-1.5..2.5` and `rotation` (degrees) to `-180..180`. `flipped` is face-down.
`dragging` is true while a player is holding the card. `sequence` is the turn
the pose belongs to; frames for any other turn are dropped. While `dragging`
is true the holder sends from `requestAnimationFrame`, capped at about 30 Hz,
and paints that pose locally instead of waiting for the echo. A settled frame
is still capped, and the latest frame inside a window is flushed so the
release is not lost. The server applies the same cap. Receivers ease toward
each broadcast on the next animation frame.

The first `dragging: true` the server accepts owns the card. Move events from
everyone else are ignored until that player releases, sends nothing for about
3 seconds, disconnects, or the turn changes. A rejected grab is told the
current pose and does not get a broadcast of its own. The relayed pose
includes `holderId` and `holderName`, which the server assigns. A guest
cannot flip the card or fly it out: a guest release is rewritten to the
resting pose (`0.5, 0.5`), so a fling never draws the next card. Only the
stage host may send a fly-out or a flip. Skip and draw are not socket events.
`room.advance` is the only path, and it rejects anyone who is not that host.

Server → client:

```json
{ "type": "state", "state": { "...snapshot...", "cardTransform": { "x": 0.5, "y": 0.5, "rotation": 0, "flipped": false, "dragging": false, "sequence": 3 } } }
{ "type": "card.transform", "transform": { "x": 0.62, "y": 0.48, "rotation": 4.2, "flipped": false, "dragging": true, "sequence": 3, "holderId": "player_123", "holderName": "Alex" } }
{ "type": "pong" }
{ "type": "error", "error": "..." }
```

The relay goes to every socket in the room. While someone holds the card,
other players' poses are not relayed. The holder is cleared when the turn
changes, so the next snapshot can deal the new card in from above the area.
The last pose is kept in memory on the hub and copied onto the next snapshot,
including who is holding it, so a late joiner does not wait for the next
gesture. `room.advance` marks the next snapshot as a deal-in (`y` above the
area) before it broadcasts, and it is refused unless the caller is the stage
host.

Snapshots are built by `src/server/realtime/snapshot.js`:

- **STAGE and CONTROLLER** both receive `turn.cardId / content / skinId / nsfw`
  plus the full room view. The shared live card is the current card face.
- The same builder is used by the tRPC `room.state` query. The hub (and the
  tRPC helper) attach `cardTransform`. Neither transport includes
  `queuedById` or any anonymous-queue field.

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
   The ephemeral card pose lives in hub memory, so it has to ride that
   channel too. It still does not belong in the database.
3. Presence becomes the only DB-write hot path; keep it (it is idempotent and
   cheap), or move `isConnected` into Redis when contention shows up.

The client protocol does not change: subscribe → full snapshot.
