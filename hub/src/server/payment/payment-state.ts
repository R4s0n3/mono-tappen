export const PURCHASE_TYPES = ["SKIN", "BUNDLE", "SUBSCRIPTION"] as const;

export type PurchaseType = (typeof PURCHASE_TYPES)[number];

export type RefundClassification = "full" | "partial" | "pending" | "none";

type RefundLike = {
  status: string | null;
  amount: number;
};

/**
 * Premium, skins, and bundles are one-time Checkout payments (`mode: "payment"`).
 * A full refund is the only refund that removes access. Partial refunds stay
 * COMPLETED so a goodwill adjustment does not delete a skin the customer still paid for.
 * Pending refunds wait until Stripe reports them as succeeded.
 */
export function classifyRefund(charge: {
  amount: number;
  amount_refunded: number;
  refunded: boolean;
  refunds?: RefundLike[] | null;
}): RefundClassification {
  const refunds = charge.refunds ?? [];
  if (refunds.length === 0) {
    if (charge.amount > 0 && (charge.refunded || charge.amount_refunded >= charge.amount)) {
      return "full";
    }
    if (charge.amount_refunded > 0) return "partial";
    return "none";
  }

  const pending = refunds.some(
    (refund) => refund.status === "pending" || refund.status === "requires_action",
  );
  const succeeded = refunds
    .filter((refund) => refund.status === "succeeded")
    .reduce((sum, refund) => sum + refund.amount, 0);

  if (succeeded <= 0) return pending ? "pending" : "none";
  if (charge.amount > 0 && succeeded >= charge.amount) return "full";
  if (pending) return "pending";
  return "partial";
}

export function isPurchaseType(value: string | null | undefined): value is PurchaseType {
  return value === "SKIN" || value === "BUNDLE" || value === "SUBSCRIPTION";
}

/**
 * Matches the historical confirm mutation: bundles grant every skin on the
 * product; skin and premium purchases grant the first skin only.
 */
export function skinsGrantedByPurchase(type: PurchaseType, skinIds: readonly string[]): string[] {
  if (type === "BUNDLE") return [...skinIds];
  const first = skinIds[0];
  return first ? [first] : [];
}

/**
 * Legacy Checkout Sessions have no `metadata.amount`. Those still fulfill.
 * New sessions record the charged cents and must come back in EUR for that amount.
 */
export function checkoutAmountMatches(session: {
  amount_total: number | null;
  currency: string | null;
  metadata: { amount?: string } | null;
}): boolean {
  if (session.currency && session.currency.toLowerCase() !== "eur") return false;
  const expected = session.metadata?.amount;
  if (!expected) return true;
  if (session.amount_total == null) return false;
  return String(session.amount_total) === expected;
}
