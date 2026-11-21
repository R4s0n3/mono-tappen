/**
 * Simulates a host and two viewers on a local WebSocket server.
 *
 * The server is not the full Next process (that needs PostgreSQL). It is a
 * one-room stand-in whose pose decisions are the production fan-out:
 * `src/shared/card-transform.js`, the same module `RoomHub` calls.
 *
 *   node scripts/ws-card-relay.mjs
 */
import { WebSocketServer, WebSocket } from "ws";
import {
  createTransformFanout,
  payloadLeaksQueue,
  sanitizeCardTransform,
} from "../src/shared/card-transform.js";

const ROOM = "room-live-card";
const HOST = { token: "host-token", playerId: "host", isHost: true, displayName: "Stage", roomId: ROOM };
const VIEW_A = { token: "view-a", playerId: "viewer-a", isHost: false, displayName: "Alex", roomId: ROOM };
const VIEW_B = { token: "view-b", playerId: "viewer-b", isHost: false, displayName: "Sam", roomId: ROOM };
const MEMBERS = new Map([HOST, VIEW_A, VIEW_B].map((member) => [member.token, member]));

const fanout = createTransformFanout();
let turnSequence = null;
/** @type {Set<import("ws").WebSocket>} */
const sockets = new Set();
/** @type {Map<import("ws").WebSocket, typeof HOST>} */
const clients = new Map();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function relay(transform) {
  const payload = { type: "card.transform", transform };
  assert(!payloadLeaksQueue(payload), "relay leaked queuedById");
  const encoded = JSON.stringify(payload);
  assert(!encoded.includes("queuedById"), "relay serialized queuedById");
  for (const sock of sockets) {
    if (sock.readyState === WebSocket.OPEN) sock.send(encoded);
  }
}

function broadcast() {
  const cardTransform = fanout.noteSequence(ROOM, turnSequence);
  const payload = {
    type: "state",
    state: {
      roomId: ROOM,
      hostId: HOST.playerId,
      cardTransform,
      turn:
        turnSequence == null
          ? null
          : {
              sequence: turnSequence,
              deckName: "Tappen",
              cardId: "card-1",
              content: "What are you taking away from tonight?",
              skinId: "default",
              nsfw: false,
              targetId: null,
            },
    },
  };
  assert(!payloadLeaksQueue(payload), "snapshot leaked queuedById");
  const encoded = JSON.stringify(payload);
  for (const sock of sockets) {
    if (sock.readyState === WebSocket.OPEN) sock.send(encoded);
  }
  return cardTransform;
}

const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });
await new Promise((resolve) => wss.once("listening", resolve));
const address = wss.address();
assert(address && typeof address === "object", "websocket server has no port");
const port = address.port;

wss.on("connection", (ws) => {
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "invalid json" }));
      return;
    }

    if (msg.type === "subscribe") {
      const member = MEMBERS.get(msg.token);
      if (!member || member.roomId !== msg.roomId) {
        ws.send(JSON.stringify({ type: "error", error: "not a member of this room" }));
        return;
      }
      clients.set(ws, member);
      sockets.add(ws);
      broadcast();
      return;
    }

    if (msg.type === "card.transform") {
      const member = clients.get(ws);
      if (!member) {
        ws.send(JSON.stringify({ type: "error", error: "subscribe first" }));
        return;
      }
      const result = fanout.handle(ROOM, member, msg, relay);
      if (result.kind === "error") {
        ws.send(JSON.stringify({ type: "error", error: result.error }));
      } else if (result.kind === "deny") {
        ws.send(JSON.stringify({ type: "card.transform", transform: result.transform }));
      }
    }
  });

  ws.on("close", () => {
    sockets.delete(ws);
    clients.delete(ws);
  });
});

function track(ws) {
  /** @type {Array<Record<string, unknown>>} */
  const messages = [];
  ws.on("message", (raw) => {
    const parsed = JSON.parse(raw.toString());
    assert(!payloadLeaksQueue(parsed), "inbound payload leaked queuedById");
    messages.push(parsed);
  });
  return messages;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
    ws._token = token;
  }).then((ws) => {
    const messages = track(ws);
    ws.send(JSON.stringify({ type: "subscribe", roomId: ROOM, token }));
    return { ws, messages };
  });
}

async function until(read, label, timeout = 1000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = read();
    if (value) return value;
    await delay(10);
  }
  throw new Error(`timed out waiting for ${label}`);
}

const deadline = setTimeout(() => {
  console.error("ws-card-relay timed out");
  process.exit(1);
}, 8000);
deadline.unref?.();

try {
  const clamped = sanitizeCardTransform({
    x: 9,
    y: -4,
    rotation: 999,
    flipped: false,
    dragging: false,
    sequence: 1,
    queuedById: "secret-player",
  });
  assert(clamped?.x === 2.5 && clamped.y === -1.5 && clamped.rotation === 180, "sanitize did not clamp");
  assert(!("queuedById" in clamped), "sanitize copied queuedById");

  const host = await connect(HOST.token);
  const viewerA = await connect(VIEW_A.token);
  const viewerB = await connect(VIEW_B.token);
  await until(() => host.messages.find((msg) => msg.type === "state"), "host snapshot");
  await until(() => viewerA.messages.find((msg) => msg.type === "state"), "viewer A snapshot");
  await until(() => viewerB.messages.find((msg) => msg.type === "state"), "viewer B snapshot");

  turnSequence = 1;
  broadcast();

  const pose = (x, dragging) => ({
    type: "card.transform",
    x,
    y: 0.5,
    rotation: (x - 0.5) * 20,
    flipped: false,
    dragging,
    sequence: 1,
    queuedById: "must-not-leak",
  });

  for (let i = 0; i < 20; i += 1) {
    host.ws.send(JSON.stringify(pose(0.5 + i * 0.01, true)));
  }

  await delay(80);

  const relays = (bucket) => bucket.filter((msg) => msg.type === "card.transform");
  const hostRelays = relays(host.messages);
  const aRelays = relays(viewerA.messages);
  const bRelays = relays(viewerB.messages);
  assert(hostRelays.length === 2, `host expected 2 throttled relays, got ${hostRelays.length}`);
  assert(aRelays.length === 2 && bRelays.length === 2, "both viewers did not receive the throttled relays");
  const lastX = 0.5 + 19 * 0.01;
  assert(aRelays[1]?.transform?.x === Math.round(lastX * 10000) / 10000, "deferred relay was not the latest pose");
  assert(JSON.stringify(aRelays[1]) === JSON.stringify(bRelays[1]), "viewers diverged");
  assert(!JSON.stringify(aRelays).includes("queuedById"), "viewer relay leaked queuedById");

  const before = relays(host.messages).length;
  viewerA.ws.send(JSON.stringify({ ...pose(0.9, true), flipped: true }));
  const denial = await until(() => {
    const mine = relays(viewerA.messages);
    return mine.length > before ? mine[mine.length - 1] : null;
  }, "hold denial");
  assert(denial.transform?.holderId === HOST.playerId, "denial did not name the holder");
  assert(denial.transform?.x !== 0.9, "a locked pose was applied");
  assert(denial.transform?.flipped === false, "a guest flip was applied while locked out");
  await delay(40);
  assert(relays(host.messages).length === before, "a locked pose was relayed");
  assert(relays(viewerB.messages).length === before, "viewer B saw a locked pose");

  await delay(40);
  host.ws.send(JSON.stringify({ ...pose(0.66, false), flipped: true }));
  const settled = await until(
    () => relays(viewerB.messages).find((msg) => msg.transform?.x === 0.66 && msg.transform?.flipped === true),
    "settled pose",
  );
  assert(settled.transform.dragging === false, "settled pose still dragging");

  viewerB.ws.close();
  await delay(20);
  host.ws.send(JSON.stringify(pose(0.73, false)));
  await until(
    () => relays(viewerA.messages).find((msg) => msg.transform?.x === 0.73),
    "pose while viewer B is gone",
  );

  const late = await connect(VIEW_B.token);
  const lateState = await until(() => late.messages.find((msg) => msg.type === "state"), "late snapshot");
  assert(lateState.state?.cardTransform?.x === 0.73, "late joiner missed the current transform");
  assert(lateState.state?.turn?.content?.includes("taking away"), "late joiner missed the card text");
  assert(!JSON.stringify(lateState).includes("queuedById"), "late snapshot leaked queuedById");

  host.ws.send(JSON.stringify({ ...pose(0.2, false), sequence: 0 }));
  await delay(50);
  assert(
    !relays(viewerA.messages).some((msg) => msg.transform?.sequence === 0),
    "stale sequence was relayed",
  );

  fanout.beginDeal(ROOM);
  turnSequence = 2;
  const dealt = broadcast();
  assert(dealt.y < 0 && dealt.sequence === 2 && dealt.flipped === false, "advance did not park the deal-in pose");
  const dealtState = await until(
    () => viewerA.messages.find((msg) => msg.type === "state" && msg.state?.turn?.sequence === 2),
    "deal snapshot",
  );
  assert(dealtState.state.cardTransform.y < 0, "viewers were not told to deal the next card");

  await delay(40);
  host.ws.send(
    JSON.stringify({
      type: "card.transform",
      x: 1.72,
      y: 0.4,
      rotation: 26,
      flipped: false,
      dragging: false,
      sequence: 2,
    }),
  );
  const flown = await until(
    () => relays(late.messages).find((msg) => msg.transform?.x === 1.72 && msg.transform?.sequence === 2),
    "fly-out",
  );
  assert(flown.transform.rotation === 26, "fly-out rotation was not relayed");

  host.ws.send(
    JSON.stringify({
      type: "card.transform",
      x: 0.5,
      y: 0.5,
      rotation: 0,
      flipped: false,
      dragging: false,
      sequence: 2,
    }),
  );
  await until(
    () => relays(late.messages).find((msg) => msg.transform?.x === 0.5 && msg.transform?.sequence === 2 && msg.transform?.holderId == null),
    "host returned the card",
  );

  viewerA.ws.send(
    JSON.stringify({
      type: "card.transform",
      x: 0.72,
      y: 0.44,
      rotation: 90,
      flipped: true,
      dragging: true,
      sequence: 2,
    }),
  );
  const guestMove = await until(
    () => relays(late.messages).find((msg) => msg.transform?.holderId === VIEW_A.playerId && msg.transform?.x === 0.72),
    "guest drag",
  );
  assert(guestMove.transform.flipped === false, "guest flip was relayed");
  assert(guestMove.transform.rotation <= 24, "guest rotation was not clamped");
  assert(guestMove.transform.holderName === "Alex", "holder name was not assigned");
  assert(guestMove.transform.dragging === true, "guest drag was not marked");

  const hostBeforeSecond = relays(host.messages).length;
  const alexBeforeSecond = relays(viewerA.messages).length;
  late.ws.send(
    JSON.stringify({
      type: "card.transform",
      x: 0.2,
      y: 0.5,
      rotation: 0,
      flipped: false,
      dragging: true,
      sequence: 2,
    }),
  );
  await delay(50);
  assert(relays(host.messages).length === hostBeforeSecond, "a second guest moved a held card");
  assert(relays(viewerA.messages).length === alexBeforeSecond, "the holder saw a second guest pose");

  const releaseMark = relays(host.messages).length;
  viewerA.ws.send(
    JSON.stringify({
      type: "card.transform",
      x: 1.72,
      y: 0.4,
      rotation: 26,
      flipped: false,
      dragging: false,
      sequence: 2,
    }),
  );
  const released = await until(
    () => relays(host.messages).slice(releaseMark).find((msg) => msg.transform?.dragging === false),
    "guest release",
  );
  assert(released.transform.x === 0.5 && released.transform.y === 0.5, "a guest fling did not spring home");
  assert(released.transform.rotation === 0, "a guest fling kept its rotation");
  assert(released.transform.holderId == null, "a guest release kept the lock");
  assert(
    !relays(host.messages).slice(releaseMark).some((msg) => msg.transform?.x === 1.72),
    "a guest fling was relayed as a skip",
  );

  console.log(`ws-card-relay ok (host + 2 viewers on 127.0.0.1:${port})`);
} finally {
  clearTimeout(deadline);
  for (const sock of sockets) sock.close();
  await new Promise((resolve) => wss.close(resolve));
}
