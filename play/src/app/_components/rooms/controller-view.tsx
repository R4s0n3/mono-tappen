"use client";

import { useRouter } from "next/navigation";
import type { RoomState, Seat } from "./types";

/**
 * The controller is a small surface: whose turn it is, and a hint of what
 * category is in play — never the card text. That decision is enforced
 * server-side; this component just renders what it receives.
 */
export function ControllerView({ state, seat }: { state: RoomState; seat: Seat }) {
  const router = useRouter();
  const isHost = state.hostId === seat.playerId;

  if (state.status === "LOBBY") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
        <span className="rounded-full bg-tappen-blue-800 px-4 py-1.5 text-sm font-bold text-tappen-sunset-300">
          {state.deckName}
        </span>
        <h1 className="font-lilita-one text-3xl text-tappen-blue-50">Waiting for the host…</h1>
        <p className="max-w-xs text-tappen-blue-300">
          The first card will show up on the stage. Keep your phone in your pocket.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {state.players.map((p) => (
            <span
              key={p.id}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                p.role === "STAGE"
                  ? "bg-tappen-purple-500 text-tappen-purple-50"
                  : "bg-tappen-blue-800 text-tappen-blue-200"
              } ${p.id === seat.playerId ? "ring-2 ring-tappen-sunset-400" : ""}`}
            >
              {p.displayName}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (state.status === "ENDED") {
    const claimUrl = `/claim?room=${state.roomId}&player=${seat.playerId}`;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
        <h1 className="font-lilita-one text-5xl text-tappen-sunset-400">That&apos;s a wrap</h1>
        <p className="max-w-xs text-lg text-tappen-blue-300">
          Good night, {seat.displayName}. Want this night to follow you around?
        </p>
        <button
          type="button"
          onClick={() => router.push(claimUrl)}
          className="font-lilita-one rounded-full bg-tappen-sunset-500 px-8 py-4 text-xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
        >
          That was me — claim it
        </button>
      </div>
    );
  }

  // ACTIVE
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
      <span className="rounded-full bg-tappen-blue-800 px-4 py-1.5 text-sm font-bold text-tappen-sunset-300">
        {state.deckName}
      </span>
      <div>
        <div className="font-lilita-one text-6xl text-tappen-sunset-400">
          {state.turn?.sequence ?? "?"}
        </div>
        <div className="mt-2 text-sm uppercase tracking-widest text-tappen-blue-300">
          {isHost ? "your card is on the stage" : "look at the stage"}
        </div>
      </div>
      <div className="animate-pulse text-tappen-blue-400">
        someone is reading their card — say what comes to mind
      </div>
    </div>
  );
}
