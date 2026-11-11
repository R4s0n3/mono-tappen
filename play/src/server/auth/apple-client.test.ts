import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import { APPLE_AUDIENCE, APPLE_ISSUER } from "./apple-token";
import { appleClientSecret, appleCredentialsFromEnv, revokeAppleRefreshToken } from "./apple-client";
import { deleteNativeAccount, erasurePlan } from "./delete-account";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

describe("Apple client secret and revoke", () => {
  it("signs a client secret with the Sign in with Apple key", () => {
    const secret = appleClientSecret(
      { teamId: "TEAMID123", keyId: "KEYID123", privateKey: pem, clientId: APPLE_AUDIENCE },
      new Date("2026-06-01T00:00:00Z"),
    );
    const [encodedHeader, encodedPayload, encodedSignature] = secret.split(".");
    assert.ok(encodedHeader && encodedPayload && encodedSignature);
    const header = JSON.parse(Buffer.from(encodedHeader!, "base64url").toString()) as { alg: string; kid: string };
    const payload = JSON.parse(Buffer.from(encodedPayload!, "base64url").toString()) as {
      iss: string;
      aud: string;
      sub: string;
    };
    assert.equal(header.alg, "ES256");
    assert.equal(header.kid, "KEYID123");
    assert.equal(payload.iss, "TEAMID123");
    assert.equal(payload.aud, APPLE_ISSUER);
    assert.equal(payload.sub, APPLE_AUDIENCE);
    const verifier = createVerify("SHA256");
    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();
    assert.equal(
      verifier.verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(encodedSignature!, "base64url")),
      true,
    );
  });

  it("skips revoke when the key is missing and still deletes the account", async () => {
    const logs: string[] = [];
    let erased = false;
    const result = await deleteNativeAccount({
      refreshToken: "refresh-token",
      revoke: (token) =>
        revokeAppleRefreshToken(token, {
          env: {},
          log: (message) => logs.push(message),
        }),
      erase: async () => {
        erased = true;
      },
    });
    assert.equal(result, "skipped");
    assert.equal(erased, true);
    assert.equal(appleCredentialsFromEnv({}), null);
    assert.match(logs[0] ?? "", /APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY/);
  });

  it("revokes the refresh token when the key is configured", async () => {
    const calls: string[] = [];
    const result = await revokeAppleRefreshToken("refresh-token", {
      env: {
        APPLE_TEAM_ID: "TEAMID123",
        APPLE_KEY_ID: "KEYID123",
        APPLE_PRIVATE_KEY: pem.replaceAll("\n", "\\n"),
      },
      now: new Date("2026-06-01T00:00:00Z"),
      fetchImpl: async (url, init) => {
        calls.push(String(url));
        const body = String(init?.body ?? "");
        assert.match(body, /token_type_hint=refresh_token/);
        assert.match(body, /client_id=app\.tappen\.ios/);
        return new Response(null, { status: 200 });
      },
    });
    assert.equal(result, "revoked");
    assert.deepEqual(calls, ["https://appleid.apple.com/auth/revoke"]);
  });
});

describe("account erasure", () => {
  it("clears the person and keeps order amounts", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const plan = erasurePlan(
      { email: "Person@Example.com" },
      [
        { id: "order-1", email: "person@example.com", amount: 699 },
        { id: "order-2", email: "other@example.com", amount: 1200 },
      ],
      now,
    );
    assert.equal(plan.user.email, null);
    assert.equal(plan.user.name, null);
    assert.equal(plan.user.deletedAt, now);
    assert.deepEqual(plan.scrubOrderIds, ["order-1"]);
  });
});
