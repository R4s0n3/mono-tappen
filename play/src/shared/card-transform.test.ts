/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acceptCardTransform,
  canSkipOrDraw,
  createRelayState,
  createTransformFanout,
  dealTransform,
  flyOutTransform,
  HOLD_TIMEOUT_MS,
  isSocketAdvanceEvent,
  noteRoomSequence,
  payloadLeaksQueue,
  type CardTransform,
  type RelayState,
} from "./card-transform";

const host = {
  isHost: true,
  playerId: "host",
  displayName: "Stage",
  role: "STAGE" as const,
};
const alex = {
  isHost: false,
  playerId: "alex",
  displayName: "Alex",
  role: "CONTROLLER" as const,
};
const sam = {
  isHost: false,
  playerId: "sam",
  displayName: "Sam",
  role: "CONTROLLER" as const,
};

function pose(overrides: Partial<CardTransform> = {}): CardTransform {
  return {
    x: 0.62,
    y: 0.48,
    rotation: 4,
    flipped: false,
    dragging: true,
    sequence: 3,
    ...overrides,
  };
}

function roomState(sequence = 3): RelayState {
  return { ...createRelayState(), sequence };
}

describe("canSkipOrDraw", () => {
  it("allows the stage player who is the recorded host", () => {
    assert.equal(
      canSkipOrDraw({ id: "host", role: "STAGE" }, { hostId: "host" }),
      true,
    );
  });

  it("allows the stage role when an older room has no host id", () => {
    assert.equal(
      canSkipOrDraw({ id: "stage", role: "STAGE" }, { hostId: null }),
      true,
    );
  });

  it("rejects a joined player", () => {
    assert.equal(
      canSkipOrDraw({ id: "alex", role: "CONTROLLER" }, { hostId: "host" }),
      false,
    );
  });

  it("rejects a stage seat who is not the recorded host", () => {
    assert.equal(
      canSkipOrDraw({ id: "stage", role: "STAGE" }, { hostId: "host" }),
      false,
    );
  });

  it("rejects a controller even when the host id points at them", () => {
    assert.equal(
      canSkipOrDraw({ id: "alex", role: "CONTROLLER" }, { hostId: "alex" }),
      false,
    );
  });

  it("rejects a missing player", () => {
    assert.equal(canSkipOrDraw(null, { hostId: "host" }), false);
    assert.equal(
      canSkipOrDraw({ id: "", role: "STAGE" }, { hostId: null }),
      false,
    );
  });
});

describe("socket skip and draw", () => {
  it("recognizes advance events that the hub ignores", () => {
    for (const type of [
      "skip",
      "draw",
      "card.skip",
      "card.draw",
      "room.advance",
    ]) {
      assert.equal(isSocketAdvanceEvent(type), true);
    }
    assert.equal(isSocketAdvanceEvent("card.transform"), false);
    assert.equal(isSocketAdvanceEvent(null), false);
  });
});

describe("card holder lock", () => {
  it("gives the first guest the card and names them", () => {
    const result = acceptCardTransform(alex, pose(), roomState(), 1_000);
    assert.equal(result.kind, "relay");
    if (result.kind !== "relay") return;
    assert.equal(result.transform.holderId, "alex");
    assert.equal(result.transform.holderName, "Alex");
    assert.equal(result.transform.x, 0.62);
    assert.equal(result.transform.dragging, true);
    assert.equal(result.state.holderId, "alex");
  });

  it("ignores a second player until the holder releases", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 1_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;

    const stolen = acceptCardTransform(
      sam,
      pose({ x: 0.2 }),
      grabbed.state,
      1_100,
    );
    assert.equal(stolen.kind, "deny");
    if (stolen.kind !== "deny") return;
    assert.equal(stolen.transform.holderId, "alex");
    assert.equal(stolen.transform.x, 0.62);
    assert.equal(stolen.state.transform?.x, 0.62);
    assert.equal(stolen.state.holderId, "alex");
  });

  it("ignores the host while a guest holds the card", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 1_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;

    const swipe = acceptCardTransform(
      host,
      flyOutTransform(3, 1, false),
      grabbed.state,
      1_200,
    );
    assert.equal(swipe.kind, "deny");
    if (swipe.kind !== "deny") return;
    assert.equal(swipe.state.transform?.x, 0.62);
  });

  it("lets the holder keep moving and refreshes the lock", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 1_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;

    const moved = acceptCardTransform(
      alex,
      pose({ x: 0.7, y: 0.6 }),
      grabbed.state,
      1_100,
    );
    assert.equal(moved.kind, "relay");
    if (moved.kind !== "relay") return;
    assert.equal(moved.transform.x, 0.7);
    assert.equal(moved.state.holderId, "alex");
    assert.equal(moved.state.holderTouchedAt, 1_100);
  });

  it("does not let a guest spoof the holder id", () => {
    const result = acceptCardTransform(
      alex,
      { ...pose(), holderId: "host", holderName: "Stage" },
      roomState(),
      1_000,
    );
    assert.equal(result.kind, "relay");
    if (result.kind !== "relay") return;
    assert.equal(result.transform.holderId, "alex");
    assert.equal(result.transform.holderName, "Alex");
    assert.equal(payloadLeaksQueue(result.transform), false);
  });

  it("clamps a guest drag into the card area and ignores a flip", () => {
    const result = acceptCardTransform(
      alex,
      pose({ x: 9, y: -4, rotation: 90, flipped: true }),
      roomState(),
      1_000,
    );
    assert.equal(result.kind, "relay");
    if (result.kind !== "relay") return;
    assert.equal(result.transform.x, 1);
    assert.equal(result.transform.y, 0.18);
    assert.equal(result.transform.rotation, 24);
    assert.equal(result.transform.flipped, false);
  });

  it("springs a guest fling home instead of skipping", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 1_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;

    const flung = acceptCardTransform(
      alex,
      flyOutTransform(3, 1, true),
      grabbed.state,
      1_200,
    );
    assert.equal(flung.kind, "relay");
    if (flung.kind !== "relay") return;
    assert.equal(flung.transform.x, 0.5);
    assert.equal(flung.transform.y, 0.5);
    assert.equal(flung.transform.rotation, 0);
    assert.equal(flung.transform.dragging, false);
    assert.equal(flung.transform.flipped, false);
    assert.equal(flung.transform.holderId, null);
    assert.equal(flung.state.holderId, null);
    assert.notEqual(flung.transform.x, flyOutTransform(3, 1, false).x);
  });

  it("keeps a host flip when the guest lets go", () => {
    const flipped = acceptCardTransform(
      host,
      pose({ x: 0.5, y: 0.5, rotation: 0, flipped: true, dragging: false }),
      roomState(),
      1_000,
    );
    assert.equal(flipped.kind, "relay");
    if (flipped.kind !== "relay") return;
    assert.equal(flipped.transform.flipped, true);
    assert.equal(flipped.state.holderId, null);

    const grabbed = acceptCardTransform(alex, pose(), flipped.state, 1_100);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;
    assert.equal(grabbed.transform.flipped, true);

    const released = acceptCardTransform(
      alex,
      pose({ dragging: false, x: 0.9 }),
      grabbed.state,
      1_200,
    );
    assert.equal(released.kind, "relay");
    if (released.kind !== "relay") return;
    assert.equal(released.transform.flipped, true);
    assert.equal(released.transform.x, 0.5);
  });

  it("still lets the host fly the card out", () => {
    const grabbed = acceptCardTransform(host, pose(), roomState(), 1_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;

    const flown = acceptCardTransform(
      host,
      flyOutTransform(3, 1, false),
      grabbed.state,
      1_200,
    );
    assert.equal(flown.kind, "relay");
    if (flown.kind !== "relay") return;
    assert.equal(flown.transform.x, 1.72);
    assert.equal(flown.transform.rotation, 26);
    assert.equal(flown.transform.dragging, false);
    assert.equal(flown.state.holderId, "host");
  });

  it("drops a guest release when that guest does not hold the card", () => {
    const result = acceptCardTransform(
      alex,
      pose({ dragging: false }),
      roomState(),
      1_000,
    );
    assert.equal(result.kind, "drop");
    if (result.kind !== "drop") return;
    assert.equal(result.state.holderId, null);
    assert.equal(result.state.transform, null);
  });

  it("drops a pose for a different turn", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 1_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;
    const stale = acceptCardTransform(
      alex,
      pose({ sequence: 2 }),
      grabbed.state,
      1_100,
    );
    assert.equal(stale.kind, "drop");
    if (stale.kind !== "drop") return;
    assert.equal(stale.state.transform?.x, 0.62);
    assert.equal(stale.state.holderId, "alex");
  });

  it("releases the lock after three seconds without a pose", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 5_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;

    const tooSoon = acceptCardTransform(
      sam,
      pose({ x: 0.3 }),
      grabbed.state,
      5_000 + HOLD_TIMEOUT_MS - 1,
    );
    assert.equal(tooSoon.kind, "deny");

    const expired = acceptCardTransform(
      sam,
      pose({ x: 0.3 }),
      grabbed.state,
      5_000 + HOLD_TIMEOUT_MS,
    );
    assert.equal(expired.kind, "relay");
    if (expired.kind !== "relay") return;
    assert.equal(expired.transform.holderId, "sam");
    assert.equal(expired.transform.x, 0.3);
    assert.equal(expired.state.holderTouchedAt, 5_000 + HOLD_TIMEOUT_MS);
  });

  it("treats a quiet holder as a new grab after the timeout", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 5_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;

    const again = acceptCardTransform(
      alex,
      pose({ x: 0.4 }),
      grabbed.state,
      5_000 + HOLD_TIMEOUT_MS,
    );
    assert.equal(again.kind, "relay");
    if (again.kind !== "relay") return;
    assert.equal(again.transform.holderId, "alex");
    assert.equal(again.transform.x, 0.4);
  });

  it("caps the relay and keeps the newest pose", () => {
    const first = acceptCardTransform(
      alex,
      pose({ x: 0.6 }),
      roomState(),
      1_000,
    );
    assert.equal(first.kind, "relay");
    if (first.kind !== "relay") return;
    const second = acceptCardTransform(
      alex,
      pose({ x: 0.81 }),
      first.state,
      1_010,
    );
    assert.equal(second.kind, "defer");
    if (second.kind !== "defer") return;
    assert.equal(second.state.deferred?.x, 0.81);
    assert.equal(second.state.holderId, "alex");
    assert.ok(second.waitMs > 0);
  });

  it("does not let an older turn clear the live holder", () => {
    const grabbed = acceptCardTransform(
      alex,
      pose({ sequence: 4 }),
      roomState(4),
      1_000,
    );
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;
    const rewind = noteRoomSequence(grabbed.state, 3);
    assert.equal(rewind.sequence, 4);
    assert.equal(rewind.holderId, "alex");
    assert.equal(rewind.transform?.x, 0.62);
  });

  it("clears the holder when the turn changes", () => {
    const grabbed = acceptCardTransform(alex, pose(), roomState(), 1_000);
    assert.equal(grabbed.kind, "relay");
    if (grabbed.kind !== "relay") return;
    const next = noteRoomSequence({ ...grabbed.state, dealPending: true }, 4);
    assert.equal(next.holderId, null);
    assert.equal(next.transform?.sequence, 4);
    assert.ok((next.transform?.y ?? 0) < 0);
    assert.equal(next.transform?.flipped, true);
  });

  it("deals a new card face down and only the host can reveal it", () => {
    assert.equal(dealTransform(3).flipped, true);
    const dealt = noteRoomSequence(
      { ...createRelayState(), dealPending: true },
      3,
    );
    assert.equal(dealt.transform?.flipped, true);

    const dragged = acceptCardTransform(
      alex,
      pose({ sequence: 3, flipped: false }),
      dealt,
      1_000,
    );
    assert.equal(dragged.kind, "relay");
    if (dragged.kind !== "relay") return;
    assert.equal(dragged.transform.flipped, true);
    assert.equal(dragged.transform.x, 0.62);

    const blocked = acceptCardTransform(
      host,
      {
        x: 0.5,
        y: 0.5,
        rotation: 0,
        flipped: false,
        dragging: false,
        sequence: 3,
      },
      dragged.state,
      1_100,
    );
    assert.equal(blocked.kind, "deny");
    if (blocked.kind !== "deny") return;
    assert.equal(blocked.transform.flipped, true);
    assert.equal(blocked.transform.holderId, "alex");

    const home = acceptCardTransform(
      alex,
      pose({ dragging: false, sequence: 3 }),
      dragged.state,
      1_200,
    );
    assert.equal(home.kind, "relay");
    if (home.kind !== "relay") return;
    assert.equal(home.transform.flipped, true);
    assert.equal(home.transform.x, 0.5);

    const revealed = acceptCardTransform(
      host,
      {
        x: 0.5,
        y: 0.5,
        rotation: 0,
        flipped: false,
        dragging: false,
        sequence: 3,
      },
      home.state,
      1_300,
    );
    assert.equal(revealed.kind, "relay");
    if (revealed.kind !== "relay") return;
    assert.equal(revealed.transform.flipped, false);

    const flown = acceptCardTransform(
      host,
      flyOutTransform(3, 1, false),
      revealed.state,
      1_400,
    );
    assert.equal(flown.kind, "relay");
    if (flown.kind !== "relay") return;
    assert.equal(flown.transform.x, 1.72);
    assert.equal(flown.transform.flipped, false);
    assert.equal(flown.transform.dragging, false);
  });

  it("lets the host skip a face down card without turning it over", () => {
    const dealt = noteRoomSequence(
      { ...createRelayState(), dealPending: true },
      5,
    );
    const parked = acceptCardTransform(
      host,
      {
        x: 0.5,
        y: 0.5,
        rotation: 0,
        flipped: true,
        dragging: false,
        sequence: 5,
      },
      dealt,
      2_000,
    );
    assert.equal(parked.kind, "relay");
    if (parked.kind !== "relay") return;
    const flown = acceptCardTransform(
      host,
      flyOutTransform(5, -1, true),
      parked.state,
      2_200,
    );
    assert.equal(flown.kind, "relay");
    if (flown.kind !== "relay") return;
    assert.equal(flown.transform.flipped, true);
    assert.equal(flown.transform.x, -0.72);
  });
});

describe("transform fanout", () => {
  it("broadcasts a rest pose when the holder goes quiet", async () => {
    const fanout = createTransformFanout({ holdTimeoutMs: 40 });
    const seen: CardTransform[] = [];
    fanout.handle("room", alex, pose(), (transform) => seen.push(transform));
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.holderId, "alex");

    await new Promise((resolve) => setTimeout(resolve, 80));

    const home = seen.at(-1);
    assert.equal(home?.x, 0.5);
    assert.equal(home?.y, 0.5);
    assert.equal(home?.dragging, false);
    assert.equal(home?.holderId, null);
    assert.equal(fanout.getTransform("room").holderId, null);
  });

  it("springs the card home when the holder disconnects", () => {
    const fanout = createTransformFanout({ holdTimeoutMs: 30_000 });
    const seen: CardTransform[] = [];
    const relay = (transform: CardTransform) => seen.push(transform);
    fanout.handle("room", alex, pose({ flipped: false }), relay, 2_000);

    const ignored = fanout.releaseHolder("room", "sam", relay, 2_100);
    assert.equal(ignored.kind, "drop");
    assert.equal(seen.length, 1);

    const released = fanout.releaseHolder("room", "alex", relay, 2_200);
    assert.equal(released.kind, "relay");
    if (released.kind !== "relay") return;
    assert.equal(released.transform.x, 0.5);
    assert.equal(released.transform.holderId, null);
    assert.equal(seen.at(-1)?.dragging, false);

    const next = fanout.handle("room", sam, pose({ x: 0.33 }), relay, 2_300);
    assert.equal(next.kind, "relay");
    if (next.kind !== "relay") return;
    assert.equal(next.transform.holderId, "sam");
    assert.equal(next.transform.x, 0.33);
    fanout.releaseHolder("room", "sam", relay, 2_400);
  });

  it("drops a deferred pose when the holder disconnects", async () => {
    const fanout = createTransformFanout({ holdTimeoutMs: 30_000 });
    const seen: CardTransform[] = [];
    const relay = (transform: CardTransform) => seen.push(transform);
    fanout.handle("room", alex, pose({ x: 0.6 }), relay, 3_000);
    const deferred = fanout.handle(
      "room",
      alex,
      pose({ x: 0.9 }),
      relay,
      3_010,
    );
    assert.equal(deferred.kind, "defer");
    fanout.releaseHolder("room", "alex", relay, 3_020);
    assert.equal(seen.at(-1)?.x, 0.5);
    assert.equal(fanout.getTransform("room").x, 0.5);
    const count = seen.length;
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(seen.length, count);
    assert.equal(
      seen.some((transform) => transform.x === 0.9),
      false,
    );
  });
});
