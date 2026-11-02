"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { saveSeat } from "@/app/_components/rooms/seat";

function HostForm() {
  const router = useRouter();
  const [deckId, setDeckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: decks, isLoading } = api.room.listDecks.useQuery();
  const create = api.room.create.useMutation({
    onSuccess: (result) => {
      saveSeat({
        roomId: result.roomId,
        token: result.token,
        playerId: result.playerId,
        role: "STAGE",
        displayName: "Stage",
      });
      router.push(`/room/${result.roomId}`);
    },
    onError: (err) => setError(err.message),
  });

  const options = [
    {
      id: null,
      name: "Tappen",
      description: "The classic pool — official Tappen cards",
      image: "/logo.svg",
    },
    ...(decks ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      description: `${d.cardCount} cards`,
      image: d.image,
    })),
  ];

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <h2 className="text-sm uppercase tracking-widest text-tappen-blue-300">pick a deck</h2>
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="size-8 animate-spin rounded-full border-4 border-tappen-blue-300 border-t-tappen-sunset-400" />
        </div>
      )}
      <div className="flex flex-col gap-3">
        {options.map((opt) => (
          <button
            key={opt.id ?? "tappen"}
            type="button"
            onClick={() => setDeckId(opt.id)}
            className={`flex items-center gap-4 rounded-2xl bg-tappen-blue-800 p-4 text-left transition ${
              deckId === opt.id ? "ring-2 ring-tappen-sunset-400" : "hover:bg-tappen-blue-700"
            }`}
          >
            {opt.image ? (
              <Image
                src={opt.image}
                alt=""
                width={48}
                height={48}
                className="rounded-xl bg-tappen-blue-700 object-cover"
              />
            ) : (
              <span className="flex size-12 items-center justify-center rounded-xl bg-tappen-purple-500 font-lilita-one text-xl text-tappen-purple-50">
                {opt.name.charAt(0)}
              </span>
            )}
            <div>
              <div className="font-bold text-tappen-blue-50">{opt.name}</div>
              <div className="text-sm text-tappen-blue-400">{opt.description}</div>
            </div>
          </button>
        ))}
      </div>
      {error && <p className="text-sm font-bold text-tappen-sunset-400">{error}</p>}
      <button
        type="button"
        disabled={create.isPending || deckId === null}
        onClick={() => create.mutate({ deckId })}
        className="font-lilita-one rounded-full bg-tappen-sunset-500 py-4 text-xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400 disabled:opacity-40"
      >
        {create.isPending ? "Starting…" : "Start a night"}
      </button>
      <Link href="/" className="text-center text-sm text-tappen-blue-400 hover:text-tappen-blue-200">
        back home
      </Link>
    </div>
  );
}

export default function HostPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
      <h1 className="font-lilita-one text-4xl text-tappen-blue-50">Host a night</h1>
      <HostForm />
    </main>
  );
}
