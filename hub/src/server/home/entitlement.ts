/**
 * What “Tappen Premium” means in both hub and play.
 *
 * Premium is `Subscription.status === "active"`. That is the same check hub
 * uses before it allows a second deck. The Premium card skin is the first skin
 * on the product named "Premium" (`type: SUBSCRIPTION`), which is the skin
 * `skinsGrantedByPurchase` grants for a subscription. Owning it is a `UserSkin`
 * row. The hub skin picker equips a skin when that row exists.
 *
 * Keep this file in step with `play/src/server/home/entitlement.ts`.
 */

export type EntitlementView = {
  premium: boolean;
  ownsPremiumSkin: boolean;
  premiumSkinId: string | null;
};

export const entitlementCopy = {
  premiumOn: "Tappen Premium is active on this account.",
  premiumOff: "Tappen Premium is not active on this account.",
  skinOn: "The Premium card skin is on this account.",
  skinOff: "The Premium card skin is not on this account.",
  equip: "You can equip it in the hub when you make a card.",
} as const;

export function premiumSkinIdFromProduct(skinIds: readonly string[]): string | null {
  return skinIds[0] ?? null;
}

export function describeEntitlement(input: {
  subscription: { status: string } | null;
  ownedSkinIds: readonly string[];
  premiumSkinId: string | null;
}): EntitlementView {
  const premiumSkinId = input.premiumSkinId;
  const ownsPremiumSkin =
    premiumSkinId !== null && input.ownedSkinIds.includes(premiumSkinId);
  return {
    premium: input.subscription?.status === "active",
    ownsPremiumSkin,
    premiumSkinId,
  };
}
