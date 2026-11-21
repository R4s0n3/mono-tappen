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
 * Any joined player may drag the current card. The first grab the server
 * accepts owns the pose until they release, go quiet, disconnect, or the turn
 * changes. Everyone else is ignored while that lock is held. Only the player
 * who may skip (the host) may flip the card or fly it off to draw the next
 * one. A guest release is rewritten to the resting pose, so a fling never
 * becomes a skip. Nothing here is written to the database. `queuedById` is
 * never a field.
 */
export const TRANSFORM_MIN_INTERVAL_MS = 33;
export const SWIPE_THRESHOLD = 0.18;
export const HOLD_TIMEOUT_MS = 3000;
export const DRAG_X_MIN = 0;
export const DRAG_X_MAX = 1;
export const DRAG_Y_MIN = 0.18;
export const DRAG_Y_MAX = 0.82;
export const DRAG_ROTATION_LIMIT = 24;

const X_MIN = -1.5;
const X_MAX = 2.5;
const Y_MIN = -1.5;
const Y_MAX = 2.5;
const ROTATION_LIMIT = 180;
const REST_EPSILON = 0.02;

const SOCKET_ADVANCE_TYPES = new Set([
  "skip",
  "draw",
  "card.skip",
  "card.draw",
  "room.advance",
]);

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function clampNum(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return round4(Math.min(max, Math.max(min, value)));
}

function clampRange(value, min, max) {
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
    holderId: null,
    holderName: null,
  };
}

/** New card waits just above the area, face down, then the host deals it in. */
export function dealTransform(sequence = null) {
  return {
    x: 0.5,
    y: -0.42,
    rotation: -11,
    flipped: true,
    dragging: false,
    sequence,
    holderId: null,
    holderName: null,
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
    holderId: null,
    holderName: null,
  };
}

function cleanName(name) {
  if (typeof name !== "string") return null;
  const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 24);
  return cleaned.length > 0 ? cleaned : null;
}

function readHolderId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return null;
  return trimmed;
}

/**
 * The stage host is the only player who may skip or draw.
 * When the room has a host id, that player must also be the stage seat.
 * Older rooms with no host id still treat the stage role as the host.
 * Controllers never pass, so a drag release cannot draw the next card.
 */
export function canSkipOrDraw(player, room) {
  if (!player || typeof player.id !== "string" || player.id.length === 0) return false;
  if (!room || typeof room !== "object") return false;
  const isHost = room.hostId ? player.id === room.hostId : player.role === "STAGE";
  return Boolean(isHost && player.role === "STAGE");
}

/** Skip and draw are not socket events. The hub drops these messages. */
export function isSocketAdvanceEvent(type) {
  return typeof type === "string" && SOCKET_ADVANCE_TYPES.has(type);
}

function clientCanSkip(client) {
  if (!client) return false;
  if (typeof client.canSkip === "boolean") return client.canSkip;
  return !!client.isHost;
}

export function createRelayState() {
  return {
    transform: null,
    deferred: null,
    sequence: null,
    lastSentAt: 0,
    dealPending: false,
    holderId: null,
    holderName: null,
    holderTouchedAt: 0,
  };
}

function normalizeState(state) {
  const base = state ?? createRelayState();
  return {
    transform: base.transform ?? null,
    deferred: base.deferred ?? null,
    sequence: base.sequence ?? null,
    lastSentAt: base.lastSentAt ?? 0,
    dealPending: !!base.dealPending,
    holderId: base.holderId ?? null,
    holderName: base.holderName ?? null,
    holderTouchedAt: base.holderTouchedAt ?? 0,
  };
}

export function markDealPending(state) {
  return { ...normalizeState(state), dealPending: true };
}

function restingPose(state, flipped) {
  const sequence = state.transform?.sequence ?? state.sequence ?? null;
  return {
    ...restTransform(sequence),
    flipped: !!flipped,
  };
}

function isSettledRest(pose) {
  return (
    !!pose &&
    !pose.dragging &&
    Math.abs(pose.x - 0.5) <= REST_EPSILON &&
    Math.abs(pose.y - 0.5) <= REST_EPSILON &&
    Math.abs(pose.rotation) <= 1
  );
}

function applyHoldTimeout(state, now, holdTimeoutMs) {
  const current = normalizeState(state);
  if (!current.holderId) return current;
  if (now - current.holderTouchedAt < holdTimeoutMs) return current;
  return {
    ...current,
    transform: restingPose(current, current.transform?.flipped),
    deferred: null,
    holderId: null,
    holderName: null,
    holderTouchedAt: 0,
  };
}

/**
 * When the turn sequence advances, park the card at the deal-in pose so the
 * new face does not appear where the previous card flew off. The holder lock
 * ends with the turn.
 */
export function noteRoomSequence(state, sequence) {
  const current = normalizeState(state);
  const seq = typeof sequence === "number" ? sequence : null;
  // A slow snapshot can still carry the previous turn. It must not clear the
  // live hold or park the new card back at the old deal-in pose.
  if (seq != null && current.sequence != null && seq < current.sequence) {
    return current;
  }
  if ((current.dealPending && seq != null) || (seq != null && current.sequence != null && seq !== current.sequence)) {
    return {
      transform: dealTransform(seq),
      deferred: null,
      sequence: seq,
      lastSentAt: current.lastSentAt,
      dealPending: false,
      holderId: null,
      holderName: null,
      holderTouchedAt: 0,
    };
  }
  return {
    ...current,
    sequence: seq ?? current.sequence,
  };
}

export function currentTransform(state) {
  const current = normalizeState(state);
  if (current.transform) {
    return {
      ...current.transform,
      sequence: current.transform.sequence ?? current.sequence,
      holderId: current.holderId,
      holderName: current.holderName,
    };
  }
  return restTransform(current.sequence);
}

function guestDragPose(parsed, sequence, flipped) {
  return {
    x: clampRange(parsed.x, DRAG_X_MIN, DRAG_X_MAX),
    y: clampRange(parsed.y, DRAG_Y_MIN, DRAG_Y_MAX),
    rotation: clampRange(parsed.rotation, -DRAG_ROTATION_LIMIT, DRAG_ROTATION_LIMIT),
    flipped,
    dragging: true,
    sequence,
    holderId: null,
    holderName: null,
  };
}

/**
 * Validate a `card.transform` message.
 * Returns `{ kind: "error", error, state }` | `{ kind: "drop", state }` |
 * `{ kind: "deny", transform, state }` |
 * `{ kind: "relay", transform, state }` | `{ kind: "defer", waitMs, state }`.
 *
 * `deny` means someone else holds the card. The caller should tell only the
 * sender, and should not broadcast the pose.
 */
export function acceptCardTransform(client, msg, state, now, holdTimeoutMs = HOLD_TIMEOUT_MS) {
  const current = applyHoldTimeout(state, now, holdTimeoutMs);

  if (!client?.playerId || typeof client.playerId !== "string") {
    return { kind: "error", error: "subscribe first", state: current };
  }
  const parsed = sanitizeCardTransform(msg);
  if (!parsed) return { kind: "error", error: "invalid card transform", state: current };

  const sequence = parsed.sequence ?? current.sequence;
  if (current.sequence != null && sequence != null && sequence !== current.sequence) {
    return { kind: "drop", state: current };
  }

  if (current.holderId && current.holderId !== client.playerId) {
    return { kind: "deny", transform: currentTransform(current), state: current };
  }

  const canSkip = clientCanSkip(client);
  const keptFlip = current.transform?.flipped ?? false;
  const displayName = cleanName(client.displayName);
  let pose;
  let holderId = null;
  let holderName = null;
  let holderTouchedAt = 0;

  if (!canSkip) {
    if (!parsed.dragging) {
      if (current.holderId !== client.playerId) {
        return { kind: "drop", state: current };
      }
      pose = restingPose({ ...current, sequence }, keptFlip);
    } else {
      pose = guestDragPose(parsed, sequence, keptFlip);
      holderId = client.playerId;
      holderName = displayName;
      holderTouchedAt = now;
    }
  } else if (parsed.dragging || !isSettledRest({ ...parsed, sequence })) {
    pose = {
      ...parsed,
      sequence,
      holderId: client.playerId,
      holderName: displayName,
    };
    holderId = client.playerId;
    holderName = displayName;
    holderTouchedAt = now;
  } else {
    pose = {
      ...parsed,
      sequence,
      dragging: false,
      holderId: null,
      holderName: null,
    };
  }

  const stored = { ...pose, sequence, holderId, holderName };
  const nextState = {
    ...current,
    transform: stored,
    holderId,
    holderName,
    holderTouchedAt,
  };

  const elapsed = now - current.lastSentAt;
  if (elapsed < TRANSFORM_MIN_INTERVAL_MS) {
    return {
      kind: "defer",
      waitMs: Math.max(0, TRANSFORM_MIN_INTERVAL_MS - elapsed),
      state: { ...nextState, deferred: stored },
    };
  }

  return {
    kind: "relay",
    transform: stored,
    state: {
      ...nextState,
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

  return {
    x,
    y,
    rotation,
    flipped: body.flipped,
    dragging: body.dragging,
    sequence,
    holderId: readHolderId(body.holderId),
    holderName: cleanName(body.holderName),
  };
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

function releaseHolderState(state, now) {
  const current = normalizeState(state);
  const pose = restingPose(current, current.transform?.flipped);
  return {
    state: {
      ...current,
      transform: pose,
      deferred: null,
      holderId: null,
      holderName: null,
      holderTouchedAt: 0,
      lastSentAt: now,
    },
    transform: pose,
  };
}

/**
 * Per-room memory for the latest transform, the 30 Hz relay cap, the single
 * holder lock, and the deal-in pose. One process, no Redis — same constraint
 * as the hub.
 */
export function createTransformFanout(options = {}) {
  const rooms = new Map();
  const timers = new Map();
  const holdTimers = new Map();
  const holdTimeoutMs = options.holdTimeoutMs ?? HOLD_TIMEOUT_MS;

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

  function clearHoldTimer(roomId) {
    const pending = holdTimers.get(roomId);
    if (!pending) return;
    clearTimeout(pending);
    holdTimers.delete(roomId);
  }

  function syncHoldTimer(roomId, state, relay) {
    clearHoldTimer(roomId);
    if (!state.holderId) return;
    const touchedAt = state.holderTouchedAt;
    const timer = setTimeout(() => {
      holdTimers.delete(roomId);
      const latest = stateFor(roomId);
      if (!latest.holderId) return;
      // A newer pose already rescheduled the lock. This callback lost the race.
      if (latest.holderTouchedAt !== touchedAt) {
        syncHoldTimer(roomId, latest, relay);
        return;
      }
      const released = releaseHolderState(latest, Date.now());
      rooms.set(roomId, released.state);
      clearTimer(roomId);
      relay(released.transform);
    }, holdTimeoutMs);
    timer.unref?.();
    holdTimers.set(roomId, timer);
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
      if (!next.holderId) clearHoldTimer(roomId);
      return currentTransform(next);
    },

    /**
     * Drop the lock when the holding player's last socket closes.
     * @param {string} roomId
     * @param {string} playerId
     * @param {(transform: ReturnType<typeof restTransform>) => void} relay
     * @param {number} [now]
     */
    releaseHolder(roomId, playerId, relay, now = Date.now()) {
      const state = stateFor(roomId);
      if (!state.holderId || state.holderId !== playerId) {
        return { kind: "drop", state };
      }
      const released = releaseHolderState(state, now);
      rooms.set(roomId, released.state);
      clearTimer(roomId);
      clearHoldTimer(roomId);
      relay(released.transform);
      return { kind: "relay", transform: released.transform, state: released.state };
    },

    /**
     * @param {string} roomId
     * @param {{ isHost?: boolean, canSkip?: boolean, playerId?: string, displayName?: string }} client
     * @param {unknown} msg
     * @param {(transform: ReturnType<typeof restTransform>) => void} relay
     * @param {number} [now]
     */
    handle(roomId, client, msg, relay, now = Date.now()) {
      const prev = stateFor(roomId);
      const result = acceptCardTransform(client, msg, prev, now, holdTimeoutMs);
      if (result.state) rooms.set(roomId, result.state);

      const cleared = !!prev.holderId && !result.state?.holderId;
      const willRelayPose = result.kind === "relay" || result.kind === "defer";
      if (cleared && !willRelayPose) {
        clearTimer(roomId);
        clearHoldTimer(roomId);
        relay(currentTransform(result.state));
      }

      if (result.kind === "error" || result.kind === "drop" || result.kind === "deny") {
        return result;
      }

      if (result.kind === "relay") {
        clearTimer(roomId);
        relay(result.transform);
        syncHoldTimer(roomId, result.state, relay);
        return result;
      }

      syncHoldTimer(roomId, result.state, relay);
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
