import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const nativeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playRoot = path.resolve(nativeRoot, "..");

describe("native play dock", () => {
  const home = fs.readFileSync(path.join(nativeRoot, "src/screens/home.tsx"), "utf8");
  const dock = fs.readFileSync(path.join(nativeRoot, "src/screens/play-dock.tsx"), "utf8");
  const cards = fs.readFileSync(path.join(playRoot, "src/app/_components/game-cards.tsx"), "utf8");
  const webHome = fs.readFileSync(path.join(playRoot, "src/app/page.tsx"), "utf8");

  it("keeps the website card controls on the overlay", () => {
    assert.match(cards, /controls\?: "overlay" \| "external"/);
    assert.match(cards, /controls = "overlay"/);
    assert.match(cards, /absolute bottom-6/);
    assert.doesNotMatch(webHome, /controls=/);
  });

  it("moves native card controls into a safe-area dock", () => {
    assert.match(home, /controls="external"/);
    assert.match(home, /env\(safe-area-inset-bottom\)/);
    assert.match(home, /env\(safe-area-inset-top\)/);
    assert.match(dock, /min-h-11/);
    assert.match(dock, /min-h-12/);
    assert.match(dock, /aria-label="Previous card"/);
    assert.match(dock, /aria-label="Next card"/);
    assert.match(dock, /Host a night/);
    assert.match(dock, /Join with a code/);
    assert.match(dock, /to="\/host"/);
    assert.match(dock, /to="\/join"/);
    assert.match(cards, /previous: goBack/);
    assert.match(cards, /swipe\("right"\)/);
  });
});
