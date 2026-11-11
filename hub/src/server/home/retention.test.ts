/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { skinsGrantedByPurchase } from "../payment/payment-state";
import { describeEntitlement, premiumSkinIdFromProduct } from "./entitlement";
import { activeApplePremiumGrant, keepSkinAfterRefund, keepSubscriptionAfterRefund } from "./retention";

describe("box grant survives a shop refund", () => {
  it("keeps Premium when the account redeemed a Home box", () => {
    assert.equal(
      keepSubscriptionAfterRefund({
        anotherCompletedPremiumPayment: false,
        redeemedHomeBox: true,
        activeAppleGrant: false,
      }),
      true,
    );
    assert.equal(
      keepSubscriptionAfterRefund({
        anotherCompletedPremiumPayment: true,
        redeemedHomeBox: false,
        activeAppleGrant: false,
      }),
      true,
    );
    assert.equal(
      keepSubscriptionAfterRefund({
        anotherCompletedPremiumPayment: false,
        redeemedHomeBox: false,
        activeAppleGrant: true,
      }),
      true,
    );
    assert.equal(
      keepSubscriptionAfterRefund({
        anotherCompletedPremiumPayment: false,
        redeemedHomeBox: false,
        activeAppleGrant: false,
      }),
      false,
    );
  });

  it("keeps only the Premium card skin that the box granted", () => {
    assert.equal(
      keepSkinAfterRefund({ grantedByAnotherPayment: false, grantedByHomeBox: true, grantedByApple: false }),
      true,
    );
    assert.equal(
      keepSkinAfterRefund({ grantedByAnotherPayment: false, grantedByHomeBox: false, grantedByApple: true }),
      true,
    );
    assert.equal(
      keepSkinAfterRefund({ grantedByAnotherPayment: false, grantedByHomeBox: false, grantedByApple: false }),
      false,
    );
  });

  it("treats a refunded or unrelated Apple row as no grant", () => {
    assert.equal(
      activeApplePremiumGrant({ productId: "app.tappen.ios.premium", revokedAt: null }),
      true,
    );
    assert.equal(
      activeApplePremiumGrant({ productId: "app.tappen.ios.premium", revokedAt: new Date() }),
      false,
    );
    assert.equal(activeApplePremiumGrant({ productId: "other", revokedAt: null }), false);
    assert.equal(activeApplePremiumGrant(null), false);
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
