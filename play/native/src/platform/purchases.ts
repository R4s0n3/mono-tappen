import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

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

export type PremiumTransactionEvent = {
  signedTransaction: string;
  appAccountToken?: string;
};

interface StoreKitPremiumPlugin {
  getProduct(): Promise<PremiumStoreProduct>;
  purchase(options: { appAccountToken: string }): Promise<PremiumPurchaseResult>;
  currentEntitlements(options: { sync: boolean }): Promise<{ signedTransactions: string[] }>;
  finish(options: { transactionId: string }): Promise<void>;
  addListener(
    eventName: "transaction",
    listenerFunc: (event: PremiumTransactionEvent) => void,
  ): Promise<PluginListenerHandle>;
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

export async function purchasePremium(appAccountToken: string): Promise<PremiumPurchaseResult> {
  if (!onIphone()) throw new Error("Premium purchase runs on the iPhone app.");
  return StoreKitPremium.purchase({ appAccountToken });
}

/** sync asks the App Store to refresh. Only the Restore button sets it. */
export async function currentPremiumEntitlements(sync: boolean): Promise<string[]> {
  if (!onIphone()) throw new Error("Premium purchase runs on the iPhone app.");
  const current = await StoreKitPremium.currentEntitlements({ sync });
  return current.signedTransactions;
}

export async function finishPremiumTransaction(transactionId: string): Promise<void> {
  if (!onIphone() || transactionId === "") return;
  await StoreKitPremium.finish({ transactionId });
}

export async function listenForPremiumTransactions(
  onTransaction: (event: PremiumTransactionEvent) => void,
): Promise<{ remove: () => Promise<void> }> {
  if (!onIphone()) return { remove: () => Promise.resolve() };
  const handle = await StoreKitPremium.addListener("transaction", onTransaction);
  return { remove: () => handle.remove() };
}
