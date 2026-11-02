"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";
import { saveSeat } from "@/app/_components/rooms/seat";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState((searchParams.get("code") ?? "").toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const join = api.room.join.useMutation({
    onSuccess: (result) => {
      saveSeat({
        roomId: result.roomId,
        token: result.token,
        playerId: result.playerId,
        role: "CONTROLLER",
        displayName: displayName.trim(),
      });
      router.push(`/room/${result.roomId}`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    join.mutate({ code, displayName });
  };

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-sm flex-col gap-4 text-left"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm uppercase tracking-widest text-tappen-blue-300">room code</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={8}
          autoCapitalize="characters"
          autoComplete="off"
          className="font-lilita-one rounded-2xl bg-tappen-blue-800 px-6 py-4 text-center text-3xl tracking-[0.3em] text-tappen-blue-50 placeholder:text-tappen-blue-500 focus:outline-none focus:ring-2 focus:ring-tappen-sunset-400"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm uppercase tracking-widest text-tappen-blue-300">your name</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="how the table knows you"
          maxLength={24}
          className="rounded-2xl bg-tappen-blue-800 px-6 py-4 text-xl text-tappen-blue-50 placeholder:text-tappen-blue-500 focus:outline-none focus:ring-2 focus:ring-tappen-sunset-400"
        />
      </label>
      {error && <p className="text-sm font-bold text-tappen-sunset-400">{error}</p>}
      <button
        type="submit"
        disabled={join.isPending || !code.trim() || !displayName.trim()}
        className="font-lilita-one rounded-full bg-tappen-sunset-500 py-4 text-xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400 disabled:opacity-40"
      >
        Join the night
      </button>
      <Link href="/" className="text-center text-sm text-tappen-blue-400 hover:text-tappen-blue-200">
        back home
      </Link>
    </form>
  );
}

export default function JoinPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50">Join a night</h1>
      <Suspense fallback={null}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
