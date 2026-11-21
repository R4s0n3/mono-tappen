/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  normalizeRoomCode,
  randomRoomCode,
  uppercaseRoomCodeInput,
} from "./room-code.ts";

const playRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

describe("room codes", () => {
  it("uppercases a typed or pasted code and keeps the caret", () => {
    const typed = uppercaseRoomCodeInput("ABcD", 3, 3);
    assert.equal(typed.value, "ABCD");
    assert.equal(typed.selectionStart, 3);
    assert.equal(typed.selectionEnd, 3);

    const pasted = uppercaseRoomCodeInput("ab23xy", null, null);
    assert.equal(pasted.value, "AB23XY");
    assert.equal(pasted.selectionStart, 6);
    assert.equal(pasted.selectionEnd, 6);

    const middle = uppercaseRoomCodeInput("ab", 1, 1);
    assert.equal(middle.value, "AB");
    assert.equal(middle.selectionStart, 1);
    assert.equal(middle.selectionEnd, 1);
  });

  it("trims and uppercases a code before lookup", () => {
    assert.equal(normalizeRoomCode("  ab23cd "), "AB23CD");
    assert.equal(normalizeRoomCode("\nab23cd\n"), "AB23CD");
    assert.equal(normalizeRoomCode("  "), "");
  });

  it("generates room codes from the uppercase alphabet", () => {
    assert.equal(ROOM_CODE_ALPHABET, ROOM_CODE_ALPHABET.toUpperCase());
    assert.doesNotMatch(ROOM_CODE_ALPHABET, /[a-z01OI]/);
    assert.equal(
      randomRoomCode(() => 0),
      "2".repeat(ROOM_CODE_LENGTH),
    );
    assert.equal(
      randomRoomCode(() => 0.999999),
      "Z".repeat(ROOM_CODE_LENGTH),
    );

    for (let i = 0; i < 40; i++) {
      const code = randomRoomCode();
      assert.equal(code, normalizeRoomCode(code));
      assert.equal(code.length, ROOM_CODE_LENGTH);
      for (const char of code) {
        assert.equal(ROOM_CODE_ALPHABET.includes(char), true);
      }
    }
  });

  it("wires the join field to rewrite the value, not only its CSS", () => {
    const page = fs.readFileSync(
      path.join(playRoot, "src/app/join/page.tsx"),
      "utf8",
    );
    const input = page.slice(
      page.indexOf("<input"),
      page.indexOf("/>", page.indexOf("<input")) + 2,
    );
    assert.match(page, /uppercaseRoomCodeInput/);
    assert.match(page, /setSelectionRange/);
    assert.match(page, /normalizeRoomCode/);
    assert.match(input, /autoCapitalize="characters"/);
    assert.match(input, /autoCorrect="off"/);
    assert.match(input, /spellCheck=\{false\}/);
    assert.doesNotMatch(input, /uppercase/);

    const join = fs.readFileSync(
      path.join(playRoot, "src/server/rooms/join-room.ts"),
      "utf8",
    );
    assert.match(join, /normalizeRoomCode\(input\.code\)/);
    const router = fs.readFileSync(
      path.join(playRoot, "src/server/api/routers/room.ts"),
      "utf8",
    );
    assert.match(router, /randomRoomCode\(/);
    assert.match(router, /\.trim\(\)\.toUpperCase\(\)/);
  });
});
