// @ts-nocheck
/**
 * Ephemeral card transform shared by the realtime hub and the play client.
 *
 * Coordinates are normalized to the shared card area: (0, 0) is the top-left,
 * (1, 1) is the bottom-right, (0.5, 0.5) is the resting center. Drag samples
 * stay inside 0..1. The deal-in and the swipe fly-out step outside that box
 * on purpose; the server clamps them to a small margin so a bad client cannot
 * park the card arbitrarily far away.
 *
 * Nothing here is written to the database. `queuedById` is never a field.
 */
export const TRANSFORM_MIN_INTERVAL_MS = 33;
export const SWIPE_THRESHOLD = 0.18;

const X_MIN = -1.5;
const X_MAX = 2.5;
const Y_MIN = -1.5;
const Y_MAX = 2.5;
const ROTATION_LIMIT = 180;

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function clampNum(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return round4(Math.min(max, Math.max(min, value)));
}

export function restTransform(sequence = null) {
  return {
    x: 0.5,
    y: 0.5,
    rotation: 0,
    flipped: false,
    dragging: false,
    sequence,
  };
}

/** New card waits just above the area, then the host deals it in. */
export function dealTransform(sequence = null) {
  return {
    x: 0.5,
    y: -0.42,
    rotation: -11,
    flipped: false,
    dragging: false,
    sequence,
  };
}

export function flyOutTransform(sequence, direction, flipped) {
  const dir = direction < 0 ? -1 : 1;
  return {
    x: dir > 0 ? 1.72 : -0.72,
    y: 0.4,
    rotation: dir * 26,
    flipped: !!flipped,
    dragging: false,
    sequence,
  };
}

export function createRelayState() {
  return {
    transform: null,
    deferred: null,
    sequence: null,
    lastSentAt: 0,
    dealPending: false,
  };
}

export function markDealPending(state) {
  return { ...state, dealPending: true };
}

/**
 * When the turn sequence advances, park the card at the deal-in pose so the
 * new face does not appear where the previous card flew off.
 */
export function noteRoomSequence(state, sequence) {
  const seq = typeof sequence === "number" ? sequence : null;
  if ((state.dealPending && seq != null) || (seq != null && state.sequence != null && seq !== state.sequence)) {
    return {
      transform: dealTransform(seq),
      deferred: null,
      sequence: seq,
      lastSentAt: state.lastSentAt,
      dealPending: false,
    };
  }
  return {
    transform: state.transform,
    deferred: state.deferred,
    sequence: seq ?? state.sequence,
    lastSentAt: state.lastSentAt,
    dealPending: state.dealPending,
  };
}

export function currentTransform(state) {
  if (state.transform) {
    return {
      ...state.transform,
      sequence: state.transform.sequence ?? state.sequence,
    };
  }
  return restTransform(state.sequence);
}

/**
 * Validate a host `card.transform` message.
 * Returns `{ kind: "error", error }` | `{ kind: "drop", state }` |
 * `{ kind: "relay", transform, state }` | `{ kind: "defer", waitMs, state }`.
 */
export function acceptCardTransform(client, msg, state, now) {
  if (!client?.isHost) {
    return { kind: "error", error: "only the host can move the card" };
  }
  const parsed = sanitizeCardTransform(msg);
  if (!parsed) return { kind: "error", error: "invalid card transform" };

  const sequence = parsed.sequence ?? state.sequence;
  if (state.sequence != null && sequence != null && sequence !== state.sequence) {
    return { kind: "drop", state };
  }

  const stored = { ...parsed, sequence };
  const elapsed = now - state.lastSentAt;
  if (elapsed < TRANSFORM_MIN_INTERVAL_MS) {
    return {
      kind: "defer",
      waitMs: Math.max(0, TRANSFORM_MIN_INTERVAL_MS - elapsed),
      state: { ...state, transform: stored, deferred: stored },
    };
  }

  return {
    kind: "relay",
    transform: stored,
    state: {
      ...state,
      transform: stored,
      deferred: null,
      lastSentAt: now,
    },
  };
}

/** Accepts the message body itself or `{ transform: body }`. */
export function sanitizeCardTransform(msg) {
  if (!msg || typeof msg !== "object") return null;
  const body = msg.transform && typeof msg.transform === "object" ? msg.transform : msg;
  const x = clampNum(body.x, X_MIN, X_MAX);
  const y = clampNum(body.y, Y_MIN, Y_MAX);
  const rotation = clampNum(body.rotation, -ROTATION_LIMIT, ROTATION_LIMIT);
  if (x === null || y === null || rotation === null) return null;
  if (typeof body.flipped !== "boolean" || typeof body.dragging !== "boolean") return null;

  let sequence = null;
  if (body.sequence === null || body.sequence === undefined) {
    sequence = null;
  } else if (typeof body.sequence === "number" && Number.isInteger(body.sequence) && body.sequence >= 0 && body.sequence < 1_000_000) {
    sequence = body.sequence;
  } else {
    return null;
  }

  return { x, y, rotation, flipped: body.flipped, dragging: body.dragging, sequence };
}

const LEAK_KEYS = new Set(["queuedById", "queuedBy"]);

/** True when any object key would expose the anonymous queue. */
export function payloadLeaksQueue(value) {
  const seen = new Set();
  const stack = [value];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const [key, child] of Object.entries(cur)) {
      if (LEAK_KEYS.has(key)) return true;
      if (child && typeof child === "object") stack.push(child);
    }
  }
  return false;
}

/**
 * Per-room memory for the latest transform, the 30 Hz relay cap, and the
 * deal-in pose. One process, no Redis — same constraint as the hub.
 */
export function createTransformFanout() {
  const rooms = new Map();
  const timers = new Map();

  function stateFor(roomId) {
    let state = rooms.get(roomId);
    if (!state) {
      state = createRelayState();
      rooms.set(roomId, state);
    }
    return state;
  }

  function clearTimer(roomId) {
    const pending = timers.get(roomId);
    if (!pending) return;
    clearTimeout(pending);
    timers.delete(roomId);
  }

  return {
    getTransform(roomId) {
      return currentTransform(stateFor(roomId));
    },

    beginDeal(roomId) {
      rooms.set(roomId, markDealPending(stateFor(roomId)));
    },

    noteSequence(roomId, sequence) {
      const next = noteRoomSequence(stateFor(roomId), sequence);
      rooms.set(roomId, next);
      if (!next.deferred) clearTimer(roomId);
      return currentTransform(next);
    },

    /**
     * @param {string} roomId
     * @param {{ isHost: boolean }} client
     * @param {unknown} msg
     * @param {(transform: ReturnType<typeof restTransform>) => void} relay
     * @param {number} [now]
     */
    handle(roomId, client, msg, relay, now = Date.now()) {
      const result = acceptCardTransform(client, msg, stateFor(roomId), now);
      if (result.kind === "error" || result.kind === "drop") return result;

      rooms.set(roomId, result.state);

      if (result.kind === "relay") {
        clearTimer(roomId);
        relay(result.transform);
        return result;
      }

      if (!timers.has(roomId)) {
        const timer = setTimeout(() => {
          timers.delete(roomId);
          const latest = stateFor(roomId);
          if (!latest.deferred) return;
          const transform = latest.deferred;
          rooms.set(roomId, {
            ...latest,
            deferred: null,
            lastSentAt: Date.now(),
          });
          relay(transform);
        }, result.waitMs);
        timer.unref?.();
        timers.set(roomId, timer);
      }

      return result;
    },
  };
}
