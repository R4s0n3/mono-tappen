// @ts-nocheck
/**
 * In-process realtime hub.
 *
 * One WebSocket server per process, attached to the Next.js custom server
 * (server.js). Clients connect to `/ws` and subscribe to exactly one room:
 *
 *   { "type": "subscribe", "roomId": "...", "token": "<player.connectionToken>" }
 *
 * The server replies with `{ "type": "state", "state": <snapshot> }` on every
 * change. There is no delta log: each broadcast is a full snapshot, which
 * makes reconnect trivially safe (re-subscribe, get a snapshot).
 *
 * The host may also send ephemeral card poses:
 *
 *   { "type": "card.transform", "x", "y", "rotation", "flipped", "dragging", "sequence" }
 *
 * Those are validated, rate-limited to ~30 Hz, kept in memory, and relayed to
 * the room. They are not written to the database. The latest pose is attached
 * to snapshots as `cardTransform` so a late joiner picks up the live card.
 *
 * tRPC mutations call `hub.publish(roomId)` after they mutate state.
 * `room.advance` calls `hub.beginDeal(roomId)` first so the new card deals in
 * instead of inheriting the previous fly-out.
 * See docs/realtime.md for the reasoning and the scaling path.
 */
import { PrismaClient } from "@prisma/client";
import { buildRoomState } from "./snapshot.js";
import { createTransformFanout } from "../../shared/card-transform.js";

/**
 * Same process, two module graphs (custom server vs webpack-compiled app):
 * the hub and the prisma client must be singletons shared across both,
 * otherwise tRPC mutations broadcast into a hub with no sockets on it.
 */
const g = globalThis;
const prisma = g.__tappenPrisma ?? (g.__tappenPrisma = new PrismaClient());

const HEARTBEAT_MS = 30_000;
class RoomHub {
  constructor() {
    /** @type {Map<string, Set<import("ws").WebSocket>>} */
    this.rooms = new Map();
    /** @type {Map<import("ws").WebSocket, { roomId: string, playerId: string, role: string, isHost: boolean, alive: boolean }>} */
    this.clients = new Map();
    this.heartbeat = null;
    this.cards = createTransformFanout();
  }

  attach(ws) {
    ws.on("message", (raw) => {
      this.handleMessage(ws, raw);
    });
    ws.on("close", () => {
      this.handleClose(ws);
    });
    ws.on("error", () => {
      // The close handler runs after an error; nothing else to do.
    });
    ws.on("pong", () => {
      const client = this.clients.get(ws);
      if (client) client.alive = true;
    });

    if (!this.heartbeat) {
      this.heartbeat = setInterval(() => {
        for (const [sock, client] of this.clients) {
          if (client.alive === false) {
            sock.terminate();
            continue;
          }
          client.alive = false;
          sock.ping();
        }
      }, HEARTBEAT_MS);
      this.heartbeat.unref?.();
    }
  }

  async handleMessage(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      this.send(ws, { type: "error", error: "invalid json" });
      return;
    }

    if (msg.type === "subscribe") {
      await this.subscribe(ws, msg);
      return;
    }

    if (msg.type === "ping") {
      this.send(ws, { type: "pong" });
      return;
    }

    if (msg.type === "card.transform") {
      this.handleCardTransform(ws, msg);
    }
  }

  async subscribe(ws, msg) {
    const { roomId, token } = msg ?? {};
    if (typeof roomId !== "string" || typeof token !== "string") {
      this.send(ws, { type: "error", error: "missing roomId or token" });
      return;
    }

    const player = await prisma.player.findUnique({
      where: { connectionToken: token },
      select: {
        id: true,
        roomId: true,
        role: true,
        room: { select: { hostId: true } },
      },
    });

    if (!player || player.roomId !== roomId) {
      this.send(ws, { type: "error", error: "not a member of this room" });
      return;
    }

    // The host is the stage seat recorded on the room. A room created before
    // hostId was backfilled still treats the STAGE role as the host.
    const hostId = player.room?.hostId ?? null;
    const isHost = hostId ? player.id === hostId : player.role === "STAGE";

    // A player may hold several sockets (open tab + phone). Presence is
    // "connected" if at least one socket for this player is open.
    const alreadySubscribed = [...(this.rooms.get(roomId) ?? [])].some(
      (sock) => this.clients.get(sock)?.playerId === player.id
    );
    if (!alreadySubscribed) {
      await prisma.player.update({
        where: { id: player.id },
        data: { isConnected: true, lastSeenAt: new Date() },
      });
    }

    this.clients.set(ws, {
      roomId,
      playerId: player.id,
      role: player.role,
      isHost,
      alive: true,
    });
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Set());
    this.rooms.get(roomId).add(ws);

    await this.broadcast(roomId);
  }

  handleCardTransform(ws, msg) {
    const client = this.clients.get(ws);
    if (!client) {
      this.send(ws, { type: "error", error: "subscribe first" });
      return;
    }

    const result = this.cards.handle(client.roomId, client, msg, (transform) => {
      // Fresh object — never forward caller fields such as queuedById.
      this.relay(client.roomId, { type: "card.transform", transform });
    });

    if (result.kind === "error") {
      this.send(ws, { type: "error", error: result.error });
    }
  }

  async handleClose(ws) {
    const client = this.clients.get(ws);
    if (!client) return;

    this.clients.delete(ws);
    this.rooms.get(client.roomId)?.delete(ws);

    const stillConnected = [...(this.rooms.get(client.roomId) ?? [])].some(
      (sock) => this.clients.get(sock)?.playerId === client.playerId
    );
    if (!stillConnected) {
      await prisma.player.update({
        where: { id: client.playerId },
        data: { isConnected: false, lastSeenAt: new Date() },
      });
      await this.broadcast(client.roomId);
    }
  }

  async broadcast(roomId) {
    const sockets = this.rooms.get(roomId);
    if (!sockets || sockets.size === 0) return;

    const byRole = new Map();
    for (const sock of sockets) {
      const client = this.clients.get(sock);
      if (!client) continue;
      if (!byRole.has(client.role)) {
        byRole.set(client.role, await buildRoomState(roomId, client.role));
      }
    }

    let sequence = null;
    for (const built of byRole.values()) {
      if (built?.turn && typeof built.turn.sequence === "number") {
        sequence = built.turn.sequence;
        break;
      }
    }
    const cardTransform = this.cards.noteSequence(roomId, sequence);

    for (const sock of sockets) {
      const client = this.clients.get(sock);
      if (!client) continue;
      const built = byRole.get(client.role);
      this.send(sock, {
        type: "state",
        state: built ? { ...built, cardTransform } : null,
      });
    }
  }

  relay(roomId, payload) {
    const sockets = this.rooms.get(roomId);
    if (!sockets) return;
    for (const sock of sockets) this.send(sock, payload);
  }

  /** Called by tRPC mutations after state changes. */
  publish(roomId) {
    return this.broadcast(roomId);
  }

  /** Called by room.advance before publish. In-memory only. */
  beginDeal(roomId) {
    this.cards.beginDeal(roomId);
  }

  getCardTransform(roomId) {
    return this.cards.getTransform(roomId);
  }

  send(ws, payload) {
    if (ws.readyState === 1) ws.send(JSON.stringify(payload));
  }
}

export const hub = g.__tappenHub ?? (g.__tappenHub = new RoomHub());
