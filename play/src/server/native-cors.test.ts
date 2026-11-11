/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nativeOriginAllowed } from "./native-cors";

describe("nativeOriginAllowed", () => {
  it("allows the Capacitor webview and local Vite", () => {
    assert.equal(nativeOriginAllowed("capacitor://localhost"), true);
    assert.equal(nativeOriginAllowed("ionic://localhost"), true);
    assert.equal(nativeOriginAllowed("http://localhost:5173"), true);
    assert.equal(nativeOriginAllowed("http://127.0.0.1:4173"), true);
    assert.equal(nativeOriginAllowed("https://localhost"), true);
  });

  it("rejects the public sites and other origins", () => {
    assert.equal(nativeOriginAllowed(null), false);
    assert.equal(nativeOriginAllowed("https://play.tappen.app"), false);
    assert.equal(nativeOriginAllowed("https://hub.tappen.app"), false);
    assert.equal(nativeOriginAllowed("https://evil.example"), false);
    assert.equal(nativeOriginAllowed("capacitor://evil.example"), false);
    assert.equal(nativeOriginAllowed("http://localhost.evil.example"), false);
    assert.equal(nativeOriginAllowed("not a url"), false);
  });
});
