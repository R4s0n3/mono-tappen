import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { configureRuntime } from "@/client/runtime";

import { api } from "./platform/api";
import {
  appleSignInCancelled,
  clearAccessToken,
  getAccessToken,
  premiumAppAccountToken,
  requestAppleCredential,
  saveAccessToken,
} from "./platform/auth";
import {
  finishPremiumTransaction,
  listenForPremiumTransactions,
  premiumPurchaseAvailable,
} from "./platform/purchases";

type AccountContextValue = {
  ready: boolean;
  signedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  busy: boolean;
  error: string | null;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utils = api.useUtils();
  const signInMutation = api.account.signInWithApple.useMutation();
  const signOutMutation = api.account.signOut.useMutation();
  const deleteMutation = api.account.delete.useMutation();
  const purchasePremium = api.account.purchasePremium.useMutation();
  const reconcilePremium = api.account.reconcilePremium.useMutation();
  const purchaseRef = useRef(purchasePremium.mutateAsync);
  const reconcileRef = useRef(reconcilePremium.mutateAsync);
  purchaseRef.current = purchasePremium.mutateAsync;
  reconcileRef.current = reconcilePremium.mutateAsync;

  useEffect(() => {
    let cancelled = false;
    void getAccessToken()
      .then((value) => {
        if (!cancelled) setToken(value);
      })
      .catch(() => {
        if (!cancelled) setToken(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signedIn = Boolean(token);

  useEffect(() => {
    if (!signedIn || !premiumPurchaseAvailable()) return;
    let cancelled = false;
    let remove = () => {};
    void (async () => {
      try {
        const reconciled = await reconcileRef.current();
        if (!cancelled && reconciled.outcome === "revoked") await utils.account.entitlement.invalidate();
      } catch {
        // The app still opens when Apple cannot be reached.
      }
      try {
        const me = await utils.account.me.fetch();
        if (cancelled) return;
        const appAccountToken = (await premiumAppAccountToken(me.id)).toLowerCase();
        const handle = await listenForPremiumTransactions((event) => {
          if (!event.appAccountToken || event.appAccountToken.toLowerCase() !== appAccountToken) return;
          void purchaseRef
            .current({ signedTransaction: event.signedTransaction })
            .then(async (claimed) => {
              for (const transactionId of claimed.transactionIds) {
                await finishPremiumTransaction(transactionId);
              }
              await utils.account.entitlement.invalidate();
            })
            .catch(() => {
              // Leave the transaction unfinished so the next launch can retry.
            });
        });
        if (cancelled) {
          await handle.remove();
          return;
        }
        remove = () => {
          void handle.remove();
        };
      } catch {
        // A Keychain or network failure leaves the purchase unfinished until the next launch.
      }
    })();
    return () => {
      cancelled = true;
      remove();
    };
  }, [signedIn, utils]);

  configureRuntime({
    accountActions: signedIn,
    getAccessToken,
  });

  const value = useMemo<AccountContextValue>(
    () => ({
      ready: token !== undefined,
      signedIn,
      busy,
      error,
      async signIn() {
        setBusy(true);
        setError(null);
        try {
          const credential = await requestAppleCredential();
          const session = await signInMutation.mutateAsync({
            identityToken: credential.identityToken,
            nonce: credential.nonce,
            authorizationCode: credential.authorizationCode,
            givenName: credential.givenName,
            familyName: credential.familyName,
          });
          await saveAccessToken(session.token);
          setToken(session.token);
          await utils.invalidate();
        } catch (caught) {
          if (!appleSignInCancelled(caught)) {
            setError(caught instanceof Error ? caught.message : "Could not sign in with Apple.");
          }
        } finally {
          setBusy(false);
        }
      },
      async signOut() {
        setBusy(true);
        setError(null);
        try {
          await signOutMutation.mutateAsync();
        } catch {
          setError("Signed out on this iPhone. The server could not be reached.");
        } finally {
          setToken(null);
          try {
            await clearAccessToken();
          } catch {
            // The in-memory token is already cleared. A Keychain error must not leave the app signed in.
          }
          try {
            await utils.invalidate();
          } finally {
            setBusy(false);
          }
        }
      },
      async deleteAccount() {
        setBusy(true);
        setError(null);
        try {
          await deleteMutation.mutateAsync({ confirm: "DELETE" });
          setToken(null);
          try {
            await clearAccessToken();
            await utils.invalidate();
          } catch {
            // The account is already deleted. Local cleanup is best-effort.
          }
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not delete the account.");
        } finally {
          setBusy(false);
        }
      },
    }),
    [busy, deleteMutation, error, signInMutation, signOutMutation, signedIn, token, utils],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside AccountProvider");
  return value;
}
