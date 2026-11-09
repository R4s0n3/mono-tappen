/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { skinsGrantedByPurchase } from "../../../../hub/src/server/payment/payment-state";
import {
  describeEntitlement as describeHubEntitlement,
  entitlementCopy as hubEntitlementCopy,
} from "../../../../hub/src/server/home/entitlement";
import {
  BoxCodeError,
  accountLabel,
  boxRedeemUrl,
  claimConfirmation,
  claimIssuedRow,
  createMemoryBoxStore,
  FAILURE_LIMIT,
  generateBoxCode,
  handleBoxHttp,
  hashBoxCode,
  isBoxCode,
  isSafeRedeemReturn,
  issueBoxCodes,
  postOriginAllowed,
  redeemCopy,
  redemptionReturnPath,
  signInHref,
  signOutHref,
  voidIssuedBoxCodes,
  type AccountRecord,
  type BoxHttpInput,
  type BoxLog,
} from "./box-code";
import { describeEntitlement, entitlementCopy, premiumSkinIdFromProduct } from "./entitlement";
import { assertExportPath, renderPrintableHtml } from "./printable";

const PEPPER = "test-pepper-do-not-use-in-production-01";
const ORIGIN = "https://play.tappen.app";
const HOST = "play.tappen.app";
const PREMIUM_SKIN = "skin_premium";

function takeIssued(rows: readonly { id: string; code: string }[]): { id: string; code: string } {
  const row = rows[0];
  if (!row) throw new Error("expected an issued code");
  return row;
}

function collectLog(): { log: BoxLog; text(): string } {
  const events: string[] = [];
  return {
    log: (event, fields) => {
      events.push(JSON.stringify({ event, ...fields }));
    },
    text: () => events.join("\n"),
  };
}

function request(store: ReturnType<typeof createMemoryBoxStore>, overrides: Partial<BoxHttpInput> = {}): BoxHttpInput {
  return {
    method: "POST",
    code: "",
    userId: "user-a",
    origin: ORIGIN,
    host: HOST,
    fetchSite: "same-origin",
    ip: "203.0.113.10",
    pepper: PEPPER,
    store,
    now: new Date("2026-11-09T12:00:00.000Z"),
    log: () => undefined,
    ...overrides,
  };
}

function codeRow(store: ReturnType<typeof createMemoryBoxStore>, code: string) {
  return store.snapshot().codes.get(hashBoxCode(code, PEPPER));
}

describe("box code format", () => {
  it("uses a high-entropy code and stores only the hash", () => {
    const code = generateBoxCode();
    assert.equal(isBoxCode(code), true);
    assert.equal(code.startsWith("tbx_"), true);
    assert.equal(code.length, "tbx_".length + 43);
    const hash = hashBoxCode(code, PEPPER);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hash.includes(code), false);
    assert.notEqual(hashBoxCode(code, `${PEPPER}-other-pepper-value`), hash);
    assert.equal(isBoxCode("cuid-home-order-id"), false);
    assert.equal(isBoxCode("https://evil.example/phish"), false);
    assert.equal(isBoxCode("//evil.example"), false);
  });
});

describe("login return", () => {
  it("sends an unauthenticated scan back to the same redeem path and nowhere else", () => {
    const code = generateBoxCode();
    const back = redemptionReturnPath(code);
    assert.ok(back);
    assert.equal(back.startsWith("/box/redeem?code="), true);
    assert.equal(isSafeRedeemReturn(back), true);
    const href = signInHref(code);
    assert.ok(href);
    const callback = new URL(href, ORIGIN).searchParams.get("callbackUrl");
    assert.equal(callback, back);
    assert.equal(signInHref("https://evil.example"), null);
    assert.equal(signInHref("//evil.example"), null);
    assert.equal(signOutHref(code)?.includes(encodeURIComponent(back)), true);
    assert.equal(isSafeRedeemReturn("https://evil.example"), false);
    assert.equal(isSafeRedeemReturn("//evil.example/box/redeem"), false);
    assert.equal(isSafeRedeemReturn("/\\evil.example"), false);
    assert.equal(postOriginAllowed({ origin: "https://evil.example", host: HOST, fetchSite: "cross-site" }), false);
    assert.equal(postOriginAllowed({ origin: "https://hub.tappen.app", host: HOST, fetchSite: "same-site" }), false);
    assert.equal(postOriginAllowed({ origin: ORIGIN, host: HOST, fetchSite: "same-origin" }), true);
    assert.equal(postOriginAllowed({ origin: ORIGIN, host: HOST, fetchSite: null }), true);
  });
});

describe("redemption", () => {
  it("rejects an invalid code and an order id without granting anything", async () => {
    const store = createMemoryBoxStore();
    const logs = collectLog();
    const orderId = "clh0me0rderguessable01";
    for (const code of ["nope", orderId, "tbx_too_short"]) {
      const result = await handleBoxHttp(request(store, { method: "GET", code, userId: null, log: logs.log }));
      assert.equal(result.outcome, "invalid");
      assert.equal(result.httpStatus, 400);
    }
    assert.equal(store.snapshot().accounts.size, 0);
    assert.equal(store.snapshot().codes.size, 0);
    assert.equal(logs.text().includes(orderId), false);
    assert.equal(logs.text().includes(PEPPER), false);
  });

  it("does not consume a code on an unauthenticated scan and returns a same-site sign-in path", async () => {
    const store = createMemoryBoxStore();
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    const logs = collectLog();
    const result = await handleBoxHttp(
      request(store, { method: "GET", code, userId: null, log: logs.log }),
    );
    assert.equal(result.outcome, "ready");
    assert.equal(result.httpStatus, 200);
    assert.equal(result.signInHref, signInHref(code));
    assert.equal(result.entitlement, null);
    const row = codeRow(store, code);
    assert.equal(row?.status, "ISSUED");
    assert.equal(row?.redeemedByUserId, null);
    assert.equal(store.snapshot().accounts.size, 0);
    assert.equal(store.snapshot().attempts.length, 0);
    assert.equal(logs.text().includes(code), false);
    assert.equal(logs.text().includes(PEPPER), false);
  });

  it("rejects a signed-out POST and a cross-site POST without consuming the code", async () => {
    const store = createMemoryBoxStore();
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    const signedOut = await handleBoxHttp(request(store, { code, userId: null }));
    assert.equal(signedOut.outcome, "unauthenticated");
    assert.equal(signedOut.httpStatus, 401);
    assert.equal(signedOut.signInHref, signInHref(code));
    const forged = await handleBoxHttp(
      request(store, { code, origin: "https://evil.example", fetchSite: "cross-site" }),
    );
    assert.equal(forged.outcome, "rejected");
    assert.equal(forged.httpStatus, 403);
    assert.equal(codeRow(store, code)?.status, "ISSUED");
    assert.equal(store.snapshot().accounts.size, 0);
  });

  it("grants Premium and the Premium card skin on the first claim", async () => {
    const store = createMemoryBoxStore();
    const { code, id } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    const result = await handleBoxHttp(request(store, { code, userId: "user-a" }));
    assert.equal(result.outcome, "claimed");
    assert.equal(result.httpStatus, 200);
    assert.deepEqual(result.entitlement, {
      premium: true,
      ownsPremiumSkin: true,
      premiumSkinId: PREMIUM_SKIN,
    });
    const account = store.snapshot().accounts.get("user-a");
    assert.equal(account?.subscription?.status, "active");
    assert.equal(account?.subscription?.endsAt, null);
    assert.equal(account?.subscription?.stripeId, `home-box:${id}`);
    assert.equal(account?.skins.some((skin) => skin.skinId === PREMIUM_SKIN), true);
    assert.equal(codeRow(store, code)?.status, "REDEEMED");
    assert.equal(codeRow(store, code)?.redeemedByUserId, "user-a");
    const stored = JSON.stringify(codeRow(store, code));
    assert.equal(stored.includes(code), false);
  });

  it("is safe when the same account claims again", async () => {
    const store = createMemoryBoxStore();
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    await handleBoxHttp(request(store, { code, userId: "user-a" }));
    const afterFirst = store.snapshot().accounts.get("user-a");
    const again = await handleBoxHttp(request(store, { code, userId: "user-a" }));
    assert.equal(again.outcome, "already_yours");
    assert.equal(again.entitlement?.premium, true);
    assert.equal(again.entitlement?.ownsPremiumSkin, true);
    const afterSecond = store.snapshot().accounts.get("user-a");
    assert.equal(afterSecond?.subscription?.stripeId, afterFirst?.subscription?.stripeId);
    assert.equal(afterSecond?.subscription?.status, "active");
    assert.equal(afterSecond?.skins.length, 1);
    assert.equal(
      afterSecond?.skins[0]?.acquiredAt.getTime(),
      afterFirst?.skins[0]?.acquiredAt.getTime(),
    );
    assert.equal(codeRow(store, code)?.redeemedByUserId, "user-a");
  });

  it("refuses a second account", async () => {
    const store = createMemoryBoxStore();
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    await handleBoxHttp(request(store, { code, userId: "user-a" }));
    const other = await handleBoxHttp(request(store, { code, userId: "user-b" }));
    assert.equal(other.outcome, "conflict");
    assert.equal(other.httpStatus, 409);
    assert.equal(other.entitlement, null);
    assert.equal(store.snapshot().accounts.has("user-b"), false);
    assert.equal(codeRow(store, code)?.redeemedByUserId, "user-a");
    const scan = await handleBoxHttp(request(store, { method: "GET", code, userId: null }));
    assert.equal(scan.outcome, "conflict");
    assert.equal(codeRow(store, code)?.status, "REDEEMED");
  });

  it("lets exactly one account win a concurrent claim", async () => {
    const store = createMemoryBoxStore();
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    const [first, second] = await Promise.all([
      handleBoxHttp(request(store, { code, userId: "user-a", ip: "203.0.113.1" })),
      handleBoxHttp(request(store, { code, userId: "user-b", ip: "203.0.113.2" })),
    ]);
    const outcomes = [first.outcome, second.outcome].sort();
    assert.deepEqual(outcomes, ["claimed", "conflict"]);
    const row = codeRow(store, code);
    assert.equal(row?.status, "REDEEMED");
    assert.ok(row?.redeemedByUserId === "user-a" || row?.redeemedByUserId === "user-b");
    const winner = row?.redeemedByUserId ?? "";
    const loser = winner === "user-a" ? "user-b" : "user-a";
    assert.equal(store.snapshot().accounts.get(winner)?.subscription?.status, "active");
    assert.equal(
      store.snapshot().accounts.get(winner)?.skins.some((skin) => skin.skinId === PREMIUM_SKIN),
      true,
    );
    assert.equal(store.snapshot().accounts.has(loser), false);
  });

  it("treats a concurrent retry by the same account as one claim", async () => {
    const store = createMemoryBoxStore();
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    const [first, second] = await Promise.all([
      handleBoxHttp(request(store, { code, userId: "user-a", ip: "203.0.113.1" })),
      handleBoxHttp(request(store, { code, userId: "user-a", ip: "203.0.113.1" })),
    ]);
    const claimed = [first.outcome, second.outcome].filter((outcome) => outcome === "claimed");
    assert.equal(claimed.length, 1);
    assert.ok([first.outcome, second.outcome].every((outcome) => outcome === "claimed" || outcome === "already_yours"));
    assert.equal(store.snapshot().accounts.get("user-a")?.skins.length, 1);
    assert.equal(codeRow(store, code)?.redeemedByUserId, "user-a");
  });

  it("does not downgrade Premium or the Premium card skin the account already has", async () => {
    const store = createMemoryBoxStore();
    const acquiredAt = new Date("2024-01-02T00:00:00.000Z");
    const existing: AccountRecord = {
      subscription: { status: "active", stripeId: "sub_shop_123", endsAt: null },
      skins: [
        { skinId: PREMIUM_SKIN, acquiredAt },
        { skinId: "skin_other", acquiredAt },
      ],
    };
    store.seedAccount("user-a", existing);
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    const result = await handleBoxHttp(request(store, { code, userId: "user-a" }));
    assert.equal(result.outcome, "claimed");
    assert.equal(result.entitlement?.premium, true);
    assert.equal(result.entitlement?.ownsPremiumSkin, true);
    const account = store.snapshot().accounts.get("user-a");
    assert.equal(account?.subscription?.status, "active");
    assert.equal(account?.subscription?.stripeId, "sub_shop_123");
    assert.equal(account?.subscription?.endsAt, null);
    assert.equal(account?.skins.length, 2);
    assert.equal(account?.skins.find((skin) => skin.skinId === PREMIUM_SKIN)?.acquiredAt.getTime(), acquiredAt.getTime());
    assert.equal(account?.skins.some((skin) => skin.skinId === "skin_other"), true);
  });

  it("makes an already-active time window permanent without replacing the Stripe id", async () => {
    const store = createMemoryBoxStore();
    const acquiredAt = new Date("2024-05-01T00:00:00.000Z");
    store.seedAccount("user-a", {
      subscription: {
        status: "active",
        stripeId: "sub_shop_456",
        endsAt: new Date("2026-12-01T00:00:00.000Z"),
      },
      skins: [{ skinId: PREMIUM_SKIN, acquiredAt }],
    });
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    await handleBoxHttp(request(store, { code, userId: "user-a" }));
    const account = store.snapshot().accounts.get("user-a");
    assert.equal(account?.subscription?.status, "active");
    assert.equal(account?.subscription?.stripeId, "sub_shop_456");
    assert.equal(account?.subscription?.endsAt, null);
    assert.equal(account?.skins.find((skin) => skin.skinId === PREMIUM_SKIN)?.acquiredAt.getTime(), acquiredAt.getTime());
  });

  it("does not consume the code when the Premium skin cannot be resolved", async () => {
    const store = createMemoryBoxStore({ premiumSkinId: null });
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    const result = await handleBoxHttp(request(store, { code, userId: "user-a" }));
    assert.equal(result.outcome, "unavailable");
    assert.equal(result.httpStatus, 503);
    assert.equal(codeRow(store, code)?.status, "ISSUED");
    assert.equal(store.snapshot().accounts.size, 0);
  });

  it("stops guessing without revealing a valid code once the limit is hit", async () => {
    const store = createMemoryBoxStore();
    const { code } = takeIssued(await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: null,
      unassigned: true,
    }));
    for (let attempt = 0; attempt < FAILURE_LIMIT; attempt += 1) {
      const result = await handleBoxHttp(
        request(store, { method: "GET", code: `guess-${attempt}`, userId: null, ip: "198.51.100.8" }),
      );
      assert.equal(result.outcome, "invalid");
    }
    const blocked = await handleBoxHttp(
      request(store, { method: "GET", code, userId: null, ip: "198.51.100.8" }),
    );
    assert.equal(blocked.outcome, "rate_limited");
    assert.equal(blocked.httpStatus, 429);
    assert.equal(codeRow(store, code)?.status, "ISSUED");
    const otherNetwork = await handleBoxHttp(
      request(store, { method: "GET", code, userId: null, ip: "198.51.100.9" }),
    );
    assert.equal(otherNetwork.outcome, "ready");
  });
});

describe("issuing", () => {
  it("issues one code per box on a paid guest order and refuses unpaid or extra codes", async () => {
    const store = createMemoryBoxStore();
    store.seedOrder({ id: "order-paid", status: "PAID", quantity: 2 });
    store.seedOrder({ id: "order-pending", status: "PENDING", quantity: 2 });
    store.seedOrder({ id: "order-cancelled", status: "CANCELLED", quantity: 1 });
    store.seedOrder({ id: "order-refunded", status: "REFUNDED", quantity: 1 });
    store.seedOrder({ id: "order-shipped", status: "SHIPPED", quantity: 1 });

    await assert.rejects(
      () => issueBoxCodes(store, { count: 1, pepper: PEPPER, homeOrderId: "order-pending", unassigned: false }),
      (error: unknown) => error instanceof BoxCodeError && error.reason === "order_not_payable",
    );
    await assert.rejects(
      () => issueBoxCodes(store, { count: 1, pepper: PEPPER, homeOrderId: "order-cancelled", unassigned: false }),
      (error: unknown) => error instanceof BoxCodeError && error.reason === "order_not_payable",
    );
    await assert.rejects(
      () => issueBoxCodes(store, { count: 1, pepper: PEPPER, homeOrderId: "order-refunded", unassigned: false }),
      (error: unknown) => error instanceof BoxCodeError && error.reason === "order_not_payable",
    );
    assert.equal(store.snapshot().codes.size, 0);

    const issued = await issueBoxCodes(store, {
      count: 2,
      pepper: PEPPER,
      homeOrderId: "order-paid",
      unassigned: false,
    });
    assert.equal(issued.length, 2);
    await assert.rejects(
      () => issueBoxCodes(store, { count: 1, pepper: PEPPER, homeOrderId: "order-paid", unassigned: false }),
      (error: unknown) => error instanceof BoxCodeError && error.reason === "order_quantity",
    );

    const { code } = takeIssued(issued);
    const claimed = await handleBoxHttp(request(store, { code, userId: "guest-claimer" }));
    assert.equal(claimed.outcome, "claimed");
    assert.equal(codeRow(store, code)?.redeemedByUserId, "guest-claimer");

    const shipped = await issueBoxCodes(store, {
      count: 1,
      pepper: PEPPER,
      homeOrderId: "order-shipped",
      unassigned: false,
    });
    assert.equal(shipped.length, 1);
    const voided = await voidIssuedBoxCodes(store, "order-paid", new Date());
    assert.equal(voided, 1);
    const remaining = [...store.snapshot().codes.values()].filter((row) => row.homeOrderId === "order-paid");
    assert.equal(remaining.filter((row) => row.status === "REDEEMED").length, 1);
    assert.equal(remaining.filter((row) => row.status === "VOID").length, 1);
  });

  it("does not treat a conditional update as a second claim", () => {
    const issued = {
      id: "code-1",
      codeHash: "abc",
      status: "ISSUED" as const,
      homeOrderId: null,
      redeemedByUserId: null,
      redeemedAt: null,
      voidedAt: null,
    };
    const at = new Date("2026-11-09T12:00:00.000Z");
    const claimed = claimIssuedRow(issued, "user-a", at);
    assert.equal(claimed?.status, "REDEEMED");
    assert.equal(claimIssuedRow(claimed ?? issued, "user-b", at), null);
  });
});

describe("entitlement in hub and play", () => {
  it("uses the shop's subscription skin and the same active-subscription check in both apps", () => {
    assert.equal(
      premiumSkinIdFromProduct(["premium", "other"]),
      skinsGrantedByPurchase("SUBSCRIPTION", ["premium", "other"])[0],
    );
    assert.equal(premiumSkinIdFromProduct([]), null);

    const cases = [
      {
        subscription: { status: "active" },
        ownedSkinIds: ["premium"],
        premiumSkinId: "premium",
      },
      {
        subscription: { status: "canceled" },
        ownedSkinIds: ["premium"],
        premiumSkinId: "premium",
      },
      {
        subscription: null,
        ownedSkinIds: ["premium"],
        premiumSkinId: "premium",
      },
      {
        subscription: { status: "active" },
        ownedSkinIds: [],
        premiumSkinId: "premium",
      },
      {
        subscription: { status: "active" },
        ownedSkinIds: ["other"],
        premiumSkinId: "premium",
      },
    ];
    for (const input of cases) {
      assert.deepEqual(describeEntitlement(input), describeHubEntitlement(input));
    }
    const both = describeEntitlement(cases[0]!);
    assert.equal(both.premium, true);
    assert.equal(both.ownsPremiumSkin, true);
    assert.equal(describeEntitlement(cases[1]!).premium, false);
    assert.equal(describeEntitlement(cases[3]!).ownsPremiumSkin, false);
    assert.equal(entitlementCopy.premiumOn, hubEntitlementCopy.premiumOn);
    assert.match(entitlementCopy.skinOn, /Premium card skin/);
  });
});

describe("printable export", () => {
  it("builds a secret HTML sheet and refuses unsafe paths", async () => {
    const code = generateBoxCode();
    const html = await renderPrintableHtml({
      codes: [{ id: "box-1", code }],
      baseOrigin: ORIGIN,
    });
    assert.match(html, /<svg/);
    assert.match(html, /Tappen Premium/);
    assert.match(html, /Premium card skin/);
    assert.ok(html.includes(boxRedeemUrl(ORIGIN, code)));
    assert.equal(html.includes(PEPPER), false);
    assert.throws(() => boxRedeemUrl("https://evil.example", code), BoxCodeError);
    assert.throws(() => boxRedeemUrl("https://play.tappen.app.evil.example", code), BoxCodeError);
    assert.equal(assertExportPath("/tmp/tappen-box-codes.html"), path.resolve("/tmp/tappen-box-codes.html"));
    assert.throws(() => assertExportPath("/tmp/codes.txt"));
    assert.throws(() => assertExportPath("/tmp/.env"));
    assert.throws(() => assertExportPath("/repo/.git/codes.html"));

    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tappen-box-"));
    const file = path.join(dir, "codes.html");
    await fs.promises.writeFile(file, html, { mode: 0o600 });
    const stat = await fs.promises.stat(file);
    assert.equal(stat.mode & 0o077, 0);
    await fs.promises.rm(dir, { recursive: true });
  });
});

describe("redeem page", () => {
  it("loads the code with GET and asks for an explicit account confirmation", () => {
    const page = fs.readFileSync(new URL("../../app/box/redeem/page.tsx", import.meta.url), "utf8");
    const action = fs.readFileSync(new URL("../../app/box/redeem/actions.ts", import.meta.url), "utf8");
    assert.match(page, /method:\s*"GET"/);
    assert.doesNotMatch(page, /method:\s*"POST"/);
    assert.match(action, /method:\s*"POST"/);
    assert.match(page, /redeemCopy\.claimButton/);
    assert.equal(redeemCopy.claimButton, "Claim for this account");
    assert.match(redeemCopy.signInLead, /permanent/);
    assert.match(claimConfirmation(accountLabel({ email: "ada@example.com" })), /ada@example.com/);
    assert.doesNotMatch(Object.values(redeemCopy).join(" "), /therapy|drink|advert/i);
  });
});
