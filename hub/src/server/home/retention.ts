/**
 * A redeemed Tappen Home box is another completed Premium grant.
 * Refunding a shop payment must not cancel Premium or delete the Premium card
 * skin while that grant is still on the account.
 */

const APPLE_PREMIUM_PRODUCT_ID = "app.tappen.ios.premium";

/**
 * An Apple purchase still grants Premium when it is the Premium product and
 * play has not recorded a refund. A row by itself is not enough.
 */
export function activeApplePremiumGrant(
  purchase: { productId: string; revokedAt: Date | null } | null,
): boolean {
  return purchase != null && purchase.revokedAt == null && purchase.productId === APPLE_PREMIUM_PRODUCT_ID;
}

export function keepSubscriptionAfterRefund(input: {
  anotherCompletedPremiumPayment: boolean;
  redeemedHomeBox: boolean;
  activeAppleGrant: boolean;
}): boolean {
  return input.anotherCompletedPremiumPayment || input.redeemedHomeBox || input.activeAppleGrant;
}

export function keepSkinAfterRefund(input: {
  grantedByAnotherPayment: boolean;
  grantedByHomeBox: boolean;
  grantedByApple: boolean;
}): boolean {
  return input.grantedByAnotherPayment || input.grantedByHomeBox || input.grantedByApple;
}
