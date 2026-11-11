/**
 * M3: StoreKit 2 non-consumables, verified on the play server with the
 * App Store Server API. No RevenueCat. The server writes the same
 * Subscription and UserSkin rows the website and the box already use.
 *
 * Product ids are suggestions, like the bundle id app.tappen.ios.
 * The owner creates the real ids in App Store Connect.
 * Premium is a one-time unlock (6.99 EUR on the web), not an auto-renewal.
 */
export const storeKitProducts = {
  premium: "app.tappen.ios.premium",
} as const;

export const purchaseConfig = {
  provider: "storekit2" as const,
  products: storeKitProducts,
};

export async function purchase(_productId: string): Promise<void> {
  throw new Error("StoreKit 2 purchases are not in this build.");
}
