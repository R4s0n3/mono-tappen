import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { configureRuntime } from "@/client/runtime";

import { api } from "./platform/api";
import {
  appleSignInCancelled,
  clearAccessToken,
  getAccessToken,
  requestAppleCredential,
  saveAccessToken,
} from "./platform/auth";

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
