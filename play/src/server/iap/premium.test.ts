import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createSign, generateKeyPairSync, X509Certificate } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { appStoreServerJwt, verifiedPremiumTransaction } from "./apple-api";
import { planPremiumClaim, type PremiumAccountSnapshot } from "./claim-premium";
import {
  PREMIUM_BUNDLE_ID,
  PREMIUM_PRODUCT_ID,
  PremiumPurchaseError,
  verifyAppleSignedTransaction,
  type ApplePremiumTransaction,
} from "./premium";

const apiKey = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const apiPem = apiKey.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const credentials = {
  APPLE_IAP_ISSUER_ID: "issuer-1",
  APPLE_IAP_KEY_ID: "KEYID123",
  APPLE_IAP_PRIVATE_KEY: apiPem.replaceAll("\n", "\\n"),
};

function pemBody(pem: string): string {
  return pem
    .replace(/-----BEGIN CERTIFICATE-----/g, "")
    .replace(/-----END CERTIFICATE-----/g, "")
    .replace(/\s/g, "");
}

function makeChain(): { root: X509Certificate; leafKey: string; x5c: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "tappen-iap-"));
  const run = (args: string[]) => execFileSync("openssl", args, { cwd: dir, stdio: "pipe" });
  run(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "root.key"]);
  run(["req", "-x509", "-new", "-key", "root.key", "-days", "3650", "-subj", "/CN=Test Root", "-out", "root.crt"]);
  run(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "mid.key"]);
  run(["req", "-new", "-key", "mid.key", "-subj", "/CN=Test Intermediate", "-out", "mid.csr"]);
  run([
    "x509",
    "-req",
    "-in",
    "mid.csr",
    "-CA",
    "root.crt",
    "-CAkey",
    "root.key",
    "-CAcreateserial",
    "-days",
    "3650",
    "-out",
    "mid.crt",
  ]);
  run(["ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", "leaf.key"]);
  run(["req", "-new", "-key", "leaf.key", "-subj", "/CN=Test Leaf", "-out", "leaf.csr"]);
  run([
    "x509",
    "-req",
    "-in",
    "leaf.csr",
    "-CA",
    "mid.crt",
    "-CAkey",
    "mid.key",
    "-CAcreateserial",
    "-days",
    "3650",
    "-out",
    "leaf.crt",
  ]);
  const leafKey = readFileSync(join(dir, "leaf.key"), "utf8");
  const x5c = [pemBody(readFileSync(join(dir, "leaf.crt"), "utf8")), pemBody(readFileSync(join(dir, "mid.crt"), "utf8"))];
  const root = new X509Certificate(readFileSync(join(dir, "root.crt"), "utf8"));
  rmSync(dir, { recursive: true, force: true });
  return { root, leafKey, x5c };
}

const chain = makeChain();

function signTransaction(payload: Record<string, unknown>, x5c = chain.x5c, leafKey = chain.leafKey): string {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", x5c })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signer = createSign("SHA256");
  signer.update(`${header}.${body}`);
  signer.end();
  const signature = signer.sign({ key: leafKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${header}.${body}.${signature}`;
}

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transactionId: "2000000123",
    originalTransactionId: "2000000123",
    bundleId: PREMIUM_BUNDLE_ID,
    productId: PREMIUM_PRODUCT_ID,
    type: "Non-Consumable",
    environment: "Production",
    ...overrides,
  };
}

function transaction(overrides: Partial<ApplePremiumTransaction> = {}): ApplePremiumTransaction {
  return {
    transactionId: "2000000123",
    originalTransactionId: "2000000123",
    productId: PREMIUM_PRODUCT_ID,
    bundleId: PREMIUM_BUNDLE_ID,
    type: "Non-Consumable",
    environment: "Production",
    revocationDate: null,
    ...overrides,
  };
}

function emptyAccount(overrides: Partial<PremiumAccountSnapshot> = {}): PremiumAccountSnapshot {
  return {
    purchaseByTransaction: null,
    purchaseByUser: null,
    subscription: null,
    ownedSkinIds: [],
    premiumSkinId: "skin-premium",
    ...overrides,
  };
}

describe("StoreKit signed transactions", () => {
  it("accepts a transaction Apple's API confirms, including a sandbox fallback", async () => {
    const signed = signTransaction(payload());
    const calls: string[] = [];
    const verified = await verifiedPremiumTransaction(signed, {
      env: credentials,
      roots: [chain.root],
      now: new Date(),
      fetchImpl: async (url, init) => {
        calls.push(String(url));
        const header = String(init?.headers && "Authorization" in init.headers ? init.headers.Authorization : "");
        const jwt = header.replace("Bearer ", "");
        const claims = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8")) as {
          aud: string;
          bid: string;
        };
        assert.equal(claims.aud, "appstoreconnect-v1");
        assert.equal(claims.bid, PREMIUM_BUNDLE_ID);
        if (String(url).includes("api.storekit.itunes.apple.com")) {
          return new Response(JSON.stringify({ errorCode: 4040010 }), { status: 404 });
        }
        return Response.json({ signedTransactionInfo: signTransaction(payload({ environment: "Sandbox" })) });
      },
    });
    assert.equal(verified.environment, "Sandbox");
    assert.equal(verified.productId, PREMIUM_PRODUCT_ID);
    assert.deepEqual(calls, [
      "https://api.storekit.itunes.apple.com/inApps/v1/transactions/2000000123",
      "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/2000000123",
    ]);
    assert.equal(appStoreServerJwt(
      { issuerId: "issuer-1", keyId: "KEYID123", privateKey: apiPem, bundleId: PREMIUM_BUNDLE_ID },
      new Date("2026-06-01T00:00:00Z"),
    ).split(".").length, 3);
  });

  it("does not call Apple when the signature, product, bundle, type, or revocation is wrong", async () => {
    const roots = [chain.root];
    const badSignature = signTransaction(payload()).replace(/.$/, (char) => (char === "a" ? "b" : "a"));
    assert.throws(() => verifyAppleSignedTransaction(badSignature, roots), (error: unknown) => {
      return error instanceof PremiumPurchaseError && error.message === "signature";
    });

    const cases: Array<[Record<string, unknown>, string]> = [
      [{ productId: "app.tappen.ios.skin" }, "product"],
      [{ bundleId: "app.other" }, "bundle"],
      [{ type: "Auto-Renewable Subscription" }, "type"],
      [{ revocationDate: 1_700_000_000_000 }, "revoked"],
    ];
    for (const [override, message] of cases) {
      let called = false;
      await assert.rejects(
        () =>
          verifiedPremiumTransaction(signTransaction(payload(override)), {
            env: credentials,
            roots,
            fetchImpl: () => {
              called = true;
              return Promise.resolve(new Response(null, { status: 500 }));
            },
          }),
        (error: unknown) => error instanceof PremiumPurchaseError && error.message === message,
      );
      assert.equal(called, false);
    }
  });

  it("rejects an API payload that does not match the device transaction", async () => {
    await assert.rejects(
      () =>
        verifiedPremiumTransaction(signTransaction(payload()), {
          env: credentials,
          roots: [chain.root],
          fetchImpl: async () =>
            Response.json({
              signedTransactionInfo: signTransaction(payload({ transactionId: "999" })),
            }),
        }),
      (error: unknown) => error instanceof PremiumPurchaseError && error.message === "transaction",
    );
  });

  it("fails closed when the In-App Purchase key is missing", async () => {
    let called = false;
    await assert.rejects(
      () =>
        verifiedPremiumTransaction(signTransaction(payload()), {
          env: {},
          roots: [chain.root],
          fetchImpl: () => {
            called = true;
            return Promise.resolve(new Response(null, { status: 200 }));
          },
        }),
      (error: unknown) => error instanceof PremiumPurchaseError && error.message === "config",
    );
    assert.equal(called, false);
  });
});

describe("Premium claim", () => {
  const bought = transaction();

  it("grants Premium and the Premium skin, and keeps a shop reference on restore", () => {
    const granted = planPremiumClaim({
      userId: "user-1",
      transaction: bought,
      account: emptyAccount(),
    });
    assert.equal(granted.outcome, "granted");
    assert.equal(granted.subscription?.action, "create");
    assert.equal(granted.subscription?.stripeId, "appstore:2000000123");
    assert.equal(granted.grantSkinId, "skin-premium");
    assert.equal(granted.createPurchase?.userId, "user-1");

    const restored = planPremiumClaim({
      userId: "user-1",
      transaction: bought,
      account: emptyAccount({
        purchaseByTransaction: { userId: "user-1", originalTransactionId: bought.originalTransactionId },
        purchaseByUser: { userId: "user-1", originalTransactionId: bought.originalTransactionId },
        subscription: { status: "active", stripeId: "sub_shop_123", endsAt: null },
        ownedSkinIds: ["skin-premium"],
      }),
    });
    assert.equal(restored.outcome, "restored");
    assert.equal(restored.createPurchase, null);
    assert.equal(restored.subscription?.action, "keep");
    assert.equal(restored.subscription?.stripeId, "sub_shop_123");
    assert.equal(restored.grantSkinId, null);
  });

  it("does not move a purchase onto a second account", () => {
    const other = planPremiumClaim({
      userId: "user-2",
      transaction: bought,
      account: emptyAccount({
        purchaseByTransaction: { userId: "user-1", originalTransactionId: bought.originalTransactionId },
      }),
    });
    assert.equal(other.outcome, "bound-to-other-account");
    assert.equal(other.subscription, null);

    const secondAppleId = planPremiumClaim({
      userId: "user-1",
      transaction: transaction({ originalTransactionId: "999", transactionId: "999" }),
      account: emptyAccount({
        purchaseByUser: { userId: "user-1", originalTransactionId: bought.originalTransactionId },
      }),
    });
    assert.equal(secondAppleId.outcome, "bound-to-other-account");
  });

  it("reactivates Premium without replacing the existing reference", () => {
    const plan = planPremiumClaim({
      userId: "user-1",
      transaction: bought,
      account: emptyAccount({
        subscription: { status: "canceled", stripeId: "sub_shop_123", endsAt: new Date("2026-01-01T00:00:00Z") },
        premiumSkinId: null,
      }),
    });
    assert.equal(plan.subscription?.action, "reactivate");
    assert.equal(plan.subscription?.stripeId, "sub_shop_123");
    assert.equal(plan.grantSkinId, null);
  });
});
