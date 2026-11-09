/**
 * A redeemed Tappen Home box is another completed Premium grant.
 * Refunding a shop payment must not cancel Premium or delete the Premium card
 * skin while that grant is still on the account.
 */

export function keepSubscriptionAfterRefund(input: {
  anotherCompletedPremiumPayment: boolean;
  redeemedHomeBox: boolean;
}): boolean {
  return input.anotherCompletedPremiumPayment || input.redeemedHomeBox;
}

export function keepSkinAfterRefund(input: {
  grantedByAnotherPayment: boolean;
  grantedByHomeBox: boolean;
}): boolean {
  return input.grantedByAnotherPayment || input.grantedByHomeBox;
}
