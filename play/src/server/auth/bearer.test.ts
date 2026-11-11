import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bearerRowUsable, hashBearerToken, newBearerToken } from "./bearer";
import { resolveRequestSession } from "./request-session";

describe("bearer tokens", () => {
  it("stores a hash instead of the token", () => {
    const token = newBearerToken();
    const again = newBearerToken();
    const hash = hashBearerToken(token);
    assert.notEqual(token, again);
    assert.notEqual(hash, token);
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(hashBearerToken(token), hash);
  });

  it("rejects expired tokens and deleted accounts", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    assert.equal(bearerRowUsable(null, now), false);
    assert.equal(bearerRowUsable({ expiresAt: new Date("2026-05-01T00:00:00Z"), deletedAt: null }, now), false);
    assert.equal(bearerRowUsable({ expiresAt: new Date("2026-07-01T00:00:00Z"), deletedAt: now }, now), false);
    assert.equal(bearerRowUsable({ expiresAt: new Date("2026-07-01T00:00:00Z"), deletedAt: null }, now), true);
  });

  it("uses a bearer token and does not fall through to the cookie session", async () => {
    const token = newBearerToken();
    let cookies = 0;
    const result = await resolveRequestSession(new Headers({ authorization: `Bearer ${token}` }), {
      lookupBearer: async (hash) => {
        assert.equal(hash, hashBearerToken(token));
        return {
          bearerTokenHash: hash,
          session: { expires: "2026-07-01T00:00:00.000Z", user: { id: "user-1" } },
        };
      },
      cookieSession: async () => {
        cookies += 1;
        return { expires: "2026-07-01T00:00:00.000Z", user: { id: "cookie-user" } };
      },
    });
    assert.equal(cookies, 0);
    assert.equal(result.session?.user.id, "user-1");
    assert.equal(result.bearerTokenHash, hashBearerToken(token));
  });

  it("keeps the website cookie session when no bearer header is sent", async () => {
    const result = await resolveRequestSession(new Headers(), {
      lookupBearer: async () => {
        throw new Error("bearer lookup should not run");
      },
      cookieSession: async () => ({ expires: "2026-07-01T00:00:00.000Z", user: { id: "cookie-user" } }),
    });
    assert.equal(result.session?.user.id, "cookie-user");
    assert.equal(result.bearerTokenHash, null);
  });

  it("does not use the cookie when the bearer token is unknown", async () => {
    let cookies = 0;
    const result = await resolveRequestSession(new Headers({ authorization: "Bearer missing" }), {
      lookupBearer: async () => null,
      cookieSession: async () => {
        cookies += 1;
        return { expires: "2026-07-01T00:00:00.000Z", user: { id: "cookie-user" } };
      },
    });
    assert.equal(cookies, 0);
    assert.equal(result.session, null);
  });
});
