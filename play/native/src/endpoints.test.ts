import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PRODUCTION_API_BASE_URL, PRODUCTION_WS_URL, resolveNativeEndpoints } from "./endpoints.ts";

describe("resolveNativeEndpoints", () => {
  it("ignores local overrides in a production build", () => {
    assert.deepEqual(
      resolveNativeEndpoints({
        prod: true,
        apiBaseUrl: "http://127.0.0.1:5173",
        wsUrl: "ws://127.0.0.1:5173/ws",
      }),
      { apiBaseUrl: PRODUCTION_API_BASE_URL, wsUrl: PRODUCTION_WS_URL },
    );
  });

  it("uses the production URLs when dev does not override them", () => {
    assert.deepEqual(resolveNativeEndpoints({ prod: false }), {
      apiBaseUrl: PRODUCTION_API_BASE_URL,
      wsUrl: PRODUCTION_WS_URL,
    });
  });

  it("lets dev point at another origin", () => {
    assert.deepEqual(
      resolveNativeEndpoints({
        prod: false,
        apiBaseUrl: "http://127.0.0.1:5173/",
        wsUrl: "ws://127.0.0.1:5173/ws",
      }),
      { apiBaseUrl: "http://127.0.0.1:5173", wsUrl: "ws://127.0.0.1:5173/ws" },
    );
  });
});
