import { Capacitor, registerPlugin } from "@capacitor/core";

/**
 * The only in-app purchase. StoreKit 2 non-consumable, checked by play with
 * the App Store Server API. No RevenueCat. The price shown in the app is the
 * price StoreKit returns. Skins are not sold here.
 */
export const PREMIUM_PRODUCT_ID = "app.tappen.ios.premium";

export const storeKitProducts = {
  premium: PREMIUM_PRODUCT_ID,
} as const;

export type PremiumStoreProduct = {
  id: string;
  displayPrice: string;
  displayName: string;
};

export type PremiumPurchaseResult =
  | { cancelled: true; signedTransaction?: undefined }
  | { cancelled: false; signedTransaction: string };

interface StoreKitPremiumPlugin {
  getProduct(): Promise<PremiumStoreProduct>;
  purchase(): Promise<PremiumPurchaseResult>;
  currentEntitlements(): Promise<{ signedTransactions: string[] }>;
}

const StoreKitPremium = registerPlugin<StoreKitPremiumPlugin>("StoreKitPremium");

function onIphone(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function premiumPurchaseAvailable(): boolean {
  return onIphone();
}

export async function loadPremiumProduct(): Promise<PremiumStoreProduct> {
  if (!onIphone()) throw new Error("Premium purchase runs on the iPhone app.");
  const product = await StoreKitPremium.getProduct();
  if (product.id !== PREMIUM_PRODUCT_ID) throw new Error("Premium is not available from the App Store.");
  return product;
}

export async function purchasePremium(): Promise<PremiumPurchaseResult> {
  if (!onIphone()) throw new Error("Premium purchase runs on the iPhone app.");
  return StoreKitPremium.purchase();
}

export async function currentPremiumEntitlements(): Promise<string[]> {
  if (!onIphone()) throw new Error("Premium purchase runs on the iPhone app.");
  const current = await StoreKitPremium.currentEntitlements();
  return current.signedTransactions;
}
