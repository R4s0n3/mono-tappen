/* eslint-disable @typescript-eslint/no-floating-promises -- node:test registers cases by calling it() */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PREMIUM_PRICE_FALLBACK_CENTS, premiumOffer } from "./premium-product";

describe("premiumOffer", () => {
  it("sells the stored price when it is positive", () => {
    assert.deepEqual(premiumOffer({ price: 699 }), { price: 699, purchasable: true });
    assert.deepEqual(premiumOffer({ price: 1299 }), { price: 1299, purchasable: true });
  });

  it("keeps the label and hides checkout when the product cannot be charged", () => {
    assert.deepEqual(premiumOffer(null), {
      price: PREMIUM_PRICE_FALLBACK_CENTS,
      purchasable: false,
    });
    assert.deepEqual(premiumOffer({ price: 0 }), {
      price: PREMIUM_PRICE_FALLBACK_CENTS,
      purchasable: false,
    });
    assert.deepEqual(premiumOffer({ price: -50 }), {
      price: PREMIUM_PRICE_FALLBACK_CENTS,
      purchasable: false,
    });
  });
});
