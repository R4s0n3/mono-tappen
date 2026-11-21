/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cardBackTone } from "./card-back";

describe("card back tone", () => {
  it("uses light ink when the skin font is light", () => {
    const tone = cardBackTone("light", null);
    assert.equal(tone.ink, "#f5f5fa");
    assert.equal(tone.muted, "#c5c6d6");
    assert.equal(tone.quietLattice, false);
  });

  it("uses dark ink for the default and other dark or mid fonts", () => {
    for (const color of ["mid", "dark", "unknown"]) {
      const tone = cardBackTone(color, "plain");
      assert.equal(tone.ink, "#1d1f2f");
      assert.equal(tone.muted, "#555a8b");
      assert.equal(tone.quietLattice, false);
    }
  });

  it("quiets the brand lattice when an own skin pattern is present", () => {
    for (const pattern of ["dots", "stripes", "waves", "grid"]) {
      assert.equal(cardBackTone("dark", pattern).quietLattice, true);
    }
    assert.equal(cardBackTone("light", "dots").ink, "#f5f5fa");
    assert.equal(cardBackTone("mid", "").quietLattice, false);
    assert.equal(cardBackTone("mid", null).quietLattice, false);
  });
});
