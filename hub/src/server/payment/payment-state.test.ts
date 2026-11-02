/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkoutAmountMatches,
  classifyRefund,
  skinsGrantedByPurchase,
} from "./payment-state";

describe("classifyRefund", () => {
  it("treats a fully refunded charge with no expanded refunds as full", () => {
    assert.equal(
      classifyRefund({ amount: 699, amount_refunded: 699, refunded: true, refunds: [] }),
      "full",
    );
  });

  it("treats a partial amount with no expanded refunds as partial", () => {
    assert.equal(
      classifyRefund({ amount: 699, amount_refunded: 100, refunded: false, refunds: [] }),
      "partial",
    );
  });

  it("waits while a refund is still pending", () => {
    assert.equal(
      classifyRefund({
        amount: 199,
        amount_refunded: 199,
        refunded: false,
        refunds: [{ status: "pending", amount: 199 }],
      }),
      "pending",
    );
  });

  it("revokes only after the succeeded refund covers the charge", () => {
    assert.equal(
      classifyRefund({
        amount: 499,
        amount_refunded: 499,
        refunded: true,
        refunds: [{ status: "succeeded", amount: 499 }],
      }),
      "full",
    );
  });

  it("keeps access when only part of the charge succeeded", () => {
    assert.equal(
      classifyRefund({
        amount: 499,
        amount_refunded: 200,
        refunded: false,
        refunds: [{ status: "succeeded", amount: 200 }],
      }),
      "partial",
    );
  });

  it("waits when a partial success still has a pending remainder", () => {
    assert.equal(
      classifyRefund({
        amount: 499,
        amount_refunded: 499,
        refunded: false,
        refunds: [
          { status: "succeeded", amount: 200 },
          { status: "pending", amount: 299 },
        ],
      }),
      "pending",
    );
  });

  it("ignores a charge that was not refunded", () => {
    assert.equal(
      classifyRefund({ amount: 199, amount_refunded: 0, refunded: false }),
      "none",
    );
  });
});

describe("skinsGrantedByPurchase", () => {
  it("grants every skin in a bundle and only the first skin otherwise", () => {
    assert.deepEqual(skinsGrantedByPurchase("BUNDLE", ["a", "b"]), ["a", "b"]);
    assert.deepEqual(skinsGrantedByPurchase("SKIN", ["a", "b"]), ["a"]);
    assert.deepEqual(skinsGrantedByPurchase("SUBSCRIPTION", ["premium"]), ["premium"]);
    assert.deepEqual(skinsGrantedByPurchase("SKIN", []), []);
  });
});

describe("checkoutAmountMatches", () => {
  it("accepts legacy sessions that did not record an amount", () => {
    assert.equal(
      checkoutAmountMatches({ amount_total: 699, currency: "eur", metadata: {} }),
      true,
    );
  });

  it("requires the recorded EUR amount on new sessions", () => {
    assert.equal(
      checkoutAmountMatches({
        amount_total: 699,
        currency: "eur",
        metadata: { amount: "699" },
      }),
      true,
    );
    assert.equal(
      checkoutAmountMatches({
        amount_total: 700,
        currency: "eur",
        metadata: { amount: "699" },
      }),
      false,
    );
    assert.equal(
      checkoutAmountMatches({
        amount_total: 699,
        currency: "usd",
        metadata: { amount: "699" },
      }),
      false,
    );
  });
});
