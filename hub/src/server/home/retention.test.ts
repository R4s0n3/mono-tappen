/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { skinsGrantedByPurchase } from "../payment/payment-state";
import { describeEntitlement, premiumSkinIdFromProduct } from "./entitlement";
import { keepSkinAfterRefund, keepSubscriptionAfterRefund } from "./retention";

describe("box grant survives a shop refund", () => {
  it("keeps Premium when the account redeemed a Home box", () => {
    assert.equal(
      keepSubscriptionAfterRefund({
        anotherCompletedPremiumPayment: false,
        redeemedHomeBox: true,
      }),
      true,
    );
    assert.equal(
      keepSubscriptionAfterRefund({
        anotherCompletedPremiumPayment: true,
        redeemedHomeBox: false,
      }),
      true,
    );
    assert.equal(
      keepSubscriptionAfterRefund({
        anotherCompletedPremiumPayment: false,
        redeemedHomeBox: false,
      }),
      false,
    );
  });

  it("keeps only the Premium card skin that the box granted", () => {
    assert.equal(
      keepSkinAfterRefund({ grantedByAnotherPayment: false, grantedByHomeBox: true }),
      true,
    );
    assert.equal(
      keepSkinAfterRefund({ grantedByAnotherPayment: false, grantedByHomeBox: false }),
      false,
    );
  });

  it("selects the same Premium skin the shop grants", () => {
    assert.equal(
      premiumSkinIdFromProduct(["premium", "other"]),
      skinsGrantedByPurchase("SUBSCRIPTION", ["premium", "other"])[0],
    );
    assert.equal(premiumSkinIdFromProduct([]), null);
  });

  it("reads the same active subscription the deck gate uses", () => {
    assert.equal(
      describeEntitlement({
        subscription: { status: "active" },
        ownedSkinIds: ["premium-skin"],
        premiumSkinId: "premium-skin",
      }).premium,
      true,
    );
    assert.equal(
      describeEntitlement({
        subscription: { status: "canceled" },
        ownedSkinIds: ["premium-skin"],
        premiumSkinId: "premium-skin",
      }).premium,
      false,
    );
  });
});
