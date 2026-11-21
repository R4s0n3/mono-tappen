/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const roomsDir = path.dirname(fileURLToPath(import.meta.url));

function source(name: string) {
  return fs.readFileSync(path.join(roomsDir, name), "utf8");
}

describe("room code pill", () => {
  it("shows a Copied confirmation and does not use dash punctuation", () => {
    const pill = source("room-code-pill.tsx");
    assert.match(pill, /Copied/);
    assert.doesNotMatch(pill, /[—–]| - /);
    assert.match(pill, /writeText/);
    assert.doesNotMatch(pill, /navigator\.share/);
  });

  it("is rendered for the host and for guests, outside the card", () => {
    const stage = source("stage-view.tsx");
    const controller = source("controller-view.tsx");
    const card = source("live-card.tsx");
    assert.match(stage, /<RoomCodePill code=\{state\.code\} \/>/);
    assert.match(controller, /<RoomCodePill code=\{state\.code\} \/>/);
    assert.equal(card.includes("RoomCodePill"), false);
  });
});
