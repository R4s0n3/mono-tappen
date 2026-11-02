"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";

function ClaimFlow() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room");
  const player = searchParams.get("player");
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const claim = api.room.claim.useMutation({});

  useEffect(() => {
    if (session?.user && room && player && claim.isIdle) {
      claim.mutate({ roomId: room, playerId: player });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, room, player]);

  if (!room || !player) {
    return (
      <p className="text-tappen-blue-300">
        This link is missing the room. Ask the host for a fresh claim link.
      </p>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-8">
        <div className="size-8 animate-spin rounded-full border-4 border-tappen-blue-300 border-t-tappen-sunset-400" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (sent) {
      return (
        <div className="flex max-w-sm flex-col gap-4">
          <h2 className="font-lilita-one text-2xl text-tappen-sunset-400">Check your inbox</h2>
          <p className="text-tappen-blue-300">
            We sent a sign-in link to <span className="font-bold text-tappen-blue-100">{email}</span>.
            Open it and you&apos;ll be claimed automatically.
          </p>
        </div>
      );
    }
    return (
      <form
        className="flex w-full max-w-sm flex-col gap-4 text-left"
        onSubmit={(e) => {
          e.preventDefault();
          signIn("email", { email, redirect: false }).then(() => setSent(true)).catch(() => setSent(true));
        }}
      >
        <h2 className="text-sm uppercase tracking-widest text-tappen-blue-300">
          that was you? make an account and keep this night
        </h2>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="rounded-2xl bg-tappen-blue-800 px-6 py-4 text-xl text-tappen-blue-50 placeholder:text-tappen-blue-500 focus:outline-none focus:ring-2 focus:ring-tappen-sunset-400"
        />
        <button
          type="submit"
          className="font-lilita-one rounded-full bg-tappen-sunset-500 py-4 text-xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
        >
          Email me a sign-in link
        </button>
      </form>
    );
  }

  // signed in
  if (claim.isPending) {
    return (
      <div className="flex justify-center py-8">
        <div className="size-8 animate-spin rounded-full border-4 border-tappen-blue-300 border-t-tappen-sunset-400" />
      </div>
    );
  }

  if (claim.data?.claimed) {
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <h2 className="font-lilita-one text-3xl text-tappen-sunset-400">Claimed</h2>
        <p className="text-tappen-blue-300">
          This seat now belongs to your account — along with everything that happens
          after it in future phases.
        </p>
      </div>
    );
  }

  if (claim.data?.reason === "already_claimed") {
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <h2 className="font-lilita-one text-2xl text-tappen-blue-50">Already yours</h2>
        <p className="text-tappen-blue-300">This seat is already attached to an account.</p>
      </div>
    );
  }

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <h2 className="font-lilita-one text-2xl text-tappen-blue-50">Nothing to claim</h2>
      <p className="text-tappen-blue-300">
        {claim.error?.message ??
          "The claim window for this room has passed or the room is still live."}
      </p>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50">Your night</h1>
      <Suspense fallback={null}>
        <ClaimFlow />
      </Suspense>
      <Link href="/" className="text-sm text-tappen-blue-400 hover:text-tappen-blue-200">
        back home
      </Link>
    </main>
  );
}
