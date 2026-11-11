import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import { APPLE_AUDIENCE, APPLE_ISSUER, AppleTokenError, sha256Hex, verifyAppleIdentityToken, type AppleJwk } from "./apple-token";
import { APPLE_JWKS_REFRESH_COOLDOWN_MS, APPLE_JWKS_TTL_MS, clearAppleJwksCache, loadAppleJwks } from "./native-session";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" }) as AppleJwk;
jwk.kid = "test-key";

function sign(claims: Record<string, unknown>, key = privateKey, headerKid = "test-key"): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: headerKid })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer.sign(key).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

const nonce = "raw-nonce-value";
const now = new Date("2026-06-01T00:00:00Z");

function claims(overrides: Record<string, unknown> = {}) {
  return {
    iss: APPLE_ISSUER,
    aud: APPLE_AUDIENCE,
    exp: Math.floor(now.getTime() / 1000) + 600,
    nonce: sha256Hex(nonce),
    sub: "apple-user-1",
    email: "Person@Example.com",
    email_verified: true,
    ...overrides,
  };
}

describe("verifyAppleIdentityToken", () => {
  it("accepts a token signed by the Apple JWKS and a hashed nonce", () => {
    const identity = verifyAppleIdentityToken(sign(claims()), { keys: [jwk], nonce, now });
    assert.equal(identity.sub, "apple-user-1");
    assert.equal(identity.email, "Person@Example.com");
    assert.equal(identity.emailVerified, true);
  });

  it("accepts a private relay address and a string email_verified flag", () => {
    const identity = verifyAppleIdentityToken(
      sign(claims({ email: "abc@privaterelay.appleid.com", email_verified: "true" })),
      { keys: [jwk], nonce, now },
    );
    assert.equal(identity.email, "abc@privaterelay.appleid.com");
    assert.equal(identity.emailVerified, true);
  });

  it("rejects a bad signature, audience, issuer, expiry, or nonce", () => {
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    const cases: Array<[string, string]> = [
      [sign(claims(), other), "signature"],
      [sign(claims({ aud: "com.example.other" })), "audience"],
      [sign(claims({ iss: "https://evil.example" })), "issuer"],
      [sign(claims({ exp: Math.floor(now.getTime() / 1000) - 120 })), "expired"],
      [sign(claims({ nonce: "not-the-nonce" })), "nonce"],
    ];
    for (const [token, message] of cases) {
      assert.throws(() => verifyAppleIdentityToken(token, { keys: [jwk], nonce, now }), (error: unknown) => {
        return error instanceof AppleTokenError && error.message === message;
      });
    }
  });
});

describe("loadAppleJwks", () => {
  const keys = [{ kty: "RSA", kid: "apple-key" }];

  it("refetches an unknown key only after the cooldown", async () => {
    clearAppleJwksCache();
    let calls = 0;
    const fetchImpl: typeof fetch = async (url, init) => {
      calls += 1;
      assert.equal(String(url), "https://appleid.apple.com/auth/keys");
      assert.ok(init?.signal);
      return new Response(JSON.stringify({ keys }), { status: 200 });
    };
    const fetchedAt = 1_000_000;
    const first = await loadAppleJwks(fetchImpl, { now: fetchedAt });
    const duringCooldown = await loadAppleJwks(fetchImpl, {
      now: fetchedAt + APPLE_JWKS_REFRESH_COOLDOWN_MS - 1,
      force: true,
    });
    assert.equal(calls, 1);
    assert.deepEqual(duringCooldown, first);

    await loadAppleJwks(fetchImpl, { now: fetchedAt + APPLE_JWKS_REFRESH_COOLDOWN_MS, force: true });
    assert.equal(calls, 2);

    await loadAppleJwks(fetchImpl, { now: fetchedAt + APPLE_JWKS_REFRESH_COOLDOWN_MS + APPLE_JWKS_TTL_MS });
    assert.equal(calls, 3);
    clearAppleJwksCache();
  });
});
