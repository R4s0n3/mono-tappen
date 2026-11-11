import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAccount } from "../account-session";
import { api } from "../platform/api";
import { SignInWithAppleButton } from "./apple-button";

function claimFailureMessage(code: string | undefined): string {
  if (code === "BAD_REQUEST") return "This room is still live. Try again after the night ends.";
  if (code === "UNAUTHORIZED") return "Sign in again to save this seat.";
  if (code === "NOT_FOUND") return "This link does not match a seat in this room.";
  return "Could not save this seat. Try again.";
}

export function ClaimScreen() {
  const [params] = useSearchParams();
  const room = params.get("room");
  const player = params.get("player");
  const account = useAccount();
  const claim = api.room.claim.useMutation();

  useEffect(() => {
    if (account.signedIn && room && player && claim.isIdle) {
      claim.mutate({ roomId: room, playerId: player });
    }
    // The mutation object changes identity; the idle flag is the gate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account.signedIn, room, player]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-center text-tappen-blue-100">
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50">Your night</h1>
      {!room || !player ? (
        <p className="max-w-xs text-lg text-tappen-blue-200">
          This link is missing the room. Ask the host for a fresh claim link.
        </p>
      ) : null}
      {room && player && !account.signedIn ? (
        <div className="flex w-full max-w-sm flex-col gap-4">
          <p className="text-lg text-tappen-blue-200">Sign in with Apple to keep this seat on your account.</p>
          <SignInWithAppleButton disabled={account.busy || !account.ready} onClick={() => void account.signIn()} />
        </div>
      ) : null}
      {claim.isPending ? <p className="text-tappen-blue-200">Saving this seat…</p> : null}
      {claim.data?.claimed ? (
        <p className="max-w-xs text-lg text-tappen-blue-50">This seat now belongs to your account.</p>
      ) : null}
      {claim.data?.reason === "already_claimed" ? (
        <p className="max-w-xs text-lg text-tappen-blue-200">This seat is already attached to an account.</p>
      ) : null}
      {claim.isError ? (
        <p className="max-w-xs text-lg text-tappen-blue-200">{claimFailureMessage(claim.error.data?.code)}</p>
      ) : null}
      {claim.data && !claim.data.claimed && claim.data.reason !== "already_claimed" ? (
        <p className="max-w-xs text-lg text-tappen-blue-200">The claim window for this room has passed.</p>
      ) : null}
      {account.error ? <p className="max-w-xs text-sm text-tappen-sunset-300">{account.error}</p> : null}
      <Link
        to="/"
        className="inline-flex min-h-11 items-center font-lilita-one text-lg text-tappen-blue-200"
      >
        Back home
      </Link>
    </main>
  );
}
