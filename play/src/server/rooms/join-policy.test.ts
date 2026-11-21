/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { joinRefusalMessage } from "./join-policy.ts";

describe("join while a round is running", () => {
  it("accepts a lobby and an active round", () => {
    assert.equal(joinRefusalMessage("LOBBY"), null);
    assert.equal(joinRefusalMessage("ACTIVE"), null);
  });

  it("refuses an ended room", () => {
    assert.equal(joinRefusalMessage("ENDED"), "this room has ended");
  });
});
