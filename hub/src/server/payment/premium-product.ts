/** Label used when the Premium subscription row is missing or not sellable. */
export const PREMIUM_PRICE_FALLBACK_CENTS = 699;

/**
 * Every Premium lookup uses this filter and order. `findFirst` without
 * `orderBy` can return a different row on each call when more than one
 * subscription is named Premium.
 */
export const premiumSubscriptionWhere = {
  name: { equals: "Premium", mode: "insensitive" as const },
  type: "SUBSCRIPTION" as const,
};

export const premiumSubscriptionOrder = { id: "asc" as const };

export function premiumOffer(product: { price: number } | null): {
  price: number;
  purchasable: boolean;
} {
  if (product && product.price > 0) {
    return { price: product.price, purchasable: true };
  }
  return { price: PREMIUM_PRICE_FALLBACK_CENTS, purchasable: false };
}
