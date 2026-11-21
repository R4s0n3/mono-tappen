/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cardBackTone } from "./card-back";
import { OWN_SKIN_PALETTES } from "./own-skin";

function channel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrast(a: string, b: string): number {
  const luma = (hex: string) => {
    const n = Number.parseInt(hex.slice(1), 16);
    const r = channel((n >> 16) & 255);
    const g = channel((n >> 8) & 255);
    const b = channel(n & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const left = luma(a);
  const right = luma(b);
  const hi = Math.max(left, right);
  const lo = Math.min(left, right);
  return (hi + 0.05) / (lo + 0.05);
}

describe("card back tone", () => {
  it("fills the default skin with its own cream and a dark mark", () => {
    const tone = cardBackTone({
      primary: "#eaeaef",
      secondary: "#f5f5fa",
      rarity: "common",
    });
    assert.equal(tone.fill, "#eaeaef");
    assert.equal(tone.symbol, "#1d1f2f");
    assert.equal(tone.glossTint, "#ffffff");
    assert.ok(tone.gloss < 0.7);
  });

  it("uses a saturated skin color as a solid field", () => {
    const sunset = cardBackTone({
      primary: "#ff9912",
      secondary: "#fff1e6",
    });
    assert.equal(sunset.fill, "#ff9912");
    assert.equal(sunset.symbol, "#1d1f2f");

    const night = cardBackTone({
      primary: "#0d0e17",
      secondary: "#501872",
    });
    assert.equal(night.fill, "#0d0e17");
    assert.equal(night.symbol, "#f5f5fa");
  });

  it("swaps in the second skin color when that color stays readable", () => {
    const tone = cardBackTone({
      primary: "#137d13",
      secondary: "#e6f3e6",
    });
    assert.equal(tone.fill, "#137d13");
    assert.equal(tone.symbol, "#e6f3e6");
  });

  it("gives legendary skins a stronger gloss in the highlight color", () => {
    const tone = cardBackTone({
      primary: "#5b2a86",
      secondary: "#e6b15a",
      highlight: "#ffdd7d",
      rarity: "legendary",
    });
    assert.equal(tone.fill, "#5b2a86");
    assert.equal(tone.symbol, "#f5f5fa");
    assert.equal(tone.glossTint, "#ffdd7d");
    assert.ok(tone.gloss > 0.75);
  });

  it("ignores unsafe colors and still returns a brand pair", () => {
    const tone = cardBackTone({
      primary: "red",
      secondary: "url(#x)",
      highlight: "#gggggg",
      rarity: "legendary",
    });
    assert.equal(tone.fill, "#1d1f2f");
    assert.equal(tone.symbol, "#f5f5fa");
    assert.equal(tone.glossTint, "#ffffff");
  });

  it("keeps the mark readable on every own skin palette", () => {
    for (const [name, palette] of Object.entries(OWN_SKIN_PALETTES)) {
      const tone = cardBackTone({
        primary: palette.primary,
        secondary: palette.secondary,
      });
      assert.equal(tone.fill, palette.primary, name);
      assert.ok(contrast(tone.symbol, tone.fill) >= 3, `${name} mark contrast`);
    }
  });
});
