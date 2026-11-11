import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../platform/api";
import { useAccount } from "../account-session";
import { SignInWithAppleButton } from "./apple-button";

const shell =
  "flex min-h-dvh flex-col items-center gap-6 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-[max(1rem,env(safe-area-inset-top))] text-center text-tappen-blue-100";

export function AccountScreen() {
  const account = useAccount();
  const me = api.account.me.useQuery(undefined, { enabled: account.signedIn });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const label = me.data?.name || me.data?.email || "Signed in";

  return (
    <main className={shell}>
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50">Account</h1>
      {account.signedIn ? (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <p className="text-lg text-tappen-blue-200">{label}</p>
          <button
            type="button"
            disabled={account.busy}
            onClick={() => void account.signOut()}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-tappen-blue-800 px-6 font-sans text-base font-semibold text-tappen-blue-100"
          >
            Sign out
          </button>
          {confirmingDelete ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-tappen-blue-800 p-4 text-left">
              <p className="font-sans text-sm leading-6 text-tappen-blue-100">
                This removes your account, sign-in, and personal details. Orders we have to keep for accounting stay, without your name or email. This cannot be undone.
              </p>
              <button
                type="button"
                disabled={account.busy}
                onClick={() => void account.deleteAccount()}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-tappen-sunset-500 px-6 font-sans text-base font-bold text-tappen-blue-900"
              >
                Delete my account
              </button>
              <button
                type="button"
                disabled={account.busy}
                onClick={() => setConfirmingDelete(false)}
                className="inline-flex min-h-11 items-center justify-center font-sans text-sm font-semibold text-tappen-blue-200"
              >
                Keep my account
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={account.busy}
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex min-h-11 items-center justify-center font-sans text-sm font-semibold text-tappen-blue-200"
            >
              Delete account
            </button>
          )}
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <p className="font-sans text-base leading-6 text-tappen-blue-200">
            Sign in with Apple is the only way to keep a night on this iPhone.
          </p>
          <SignInWithAppleButton disabled={account.busy || !account.ready} onClick={() => void account.signIn()} />
        </div>
      )}
      {account.error ? <p className="max-w-sm font-sans text-sm text-tappen-sunset-300">{account.error}</p> : null}
      <Link to="/" className="inline-flex min-h-11 items-center font-sans text-sm font-semibold text-tappen-blue-200">
        Back home
      </Link>
    </main>
  );
}
