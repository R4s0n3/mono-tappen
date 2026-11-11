import { useEffect, useState } from "react";

import { api } from "../platform/api";
import {
  currentPremiumEntitlements,
  loadPremiumProduct,
  premiumPurchaseAvailable,
  purchasePremium,
} from "../platform/purchases";

export function PremiumPanel() {
  const entitlement = api.account.entitlement.useQuery();
  const utils = api.useUtils();
  const purchase = api.account.purchasePremium.useMutation();
  const restore = api.account.restorePremium.useMutation();
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onPhone = premiumPurchaseAvailable();
  const premium = entitlement.data?.premium === true;

  useEffect(() => {
    if (!onPhone || premium) return;
    let cancelled = false;
    void loadPremiumProduct()
      .then((product) => {
        if (!cancelled) setPrice(product.displayPrice);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Premium is not available from the App Store.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onPhone, premium]);

  if (premium) {
    return <p className="font-sans text-base text-tappen-blue-100">Tappen Premium is on this account.</p>;
  }

  if (!onPhone) {
    return (
      <p className="font-sans text-sm leading-6 text-tappen-blue-200">Premium purchase runs on the iPhone app.</p>
    );
  }

  async function buy(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await purchasePremium();
      if (result.cancelled || !result.signedTransaction) return;
      await purchase.mutateAsync({ signedTransaction: result.signedTransaction });
      await utils.account.entitlement.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not complete the purchase.");
    } finally {
      setBusy(false);
    }
  }

  async function restorePurchases(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const signedTransactions = await currentPremiumEntitlements();
      if (signedTransactions.length === 0) {
        setError("No Premium purchase was found for this Apple ID.");
        return;
      }
      await restore.mutateAsync({ signedTransactions: signedTransactions.slice(0, 8) });
      await utils.account.entitlement.invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not restore purchases.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-sans text-sm leading-6 text-tappen-blue-200">
        Tappen Premium is a one-time unlock for this account.
        {price ? ` ${price}.` : ""}
      </p>
      <button
        type="button"
        disabled={busy || !price}
        onClick={() => void buy()}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-tappen-sunset-500 px-6 font-sans text-base font-bold text-tappen-blue-900 disabled:opacity-60"
      >
        {price ? `Get Premium · ${price}` : "Get Premium"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void restorePurchases()}
        className="inline-flex min-h-11 items-center justify-center font-sans text-sm font-semibold text-tappen-blue-200"
      >
        Restore purchases
      </button>
      {error ? <p className="font-sans text-sm text-tappen-sunset-300">{error}</p> : null}
    </div>
  );
}
