"use client";

import { useRouter } from "next/navigation";
import type { CardSocket, RoomState, Seat } from "./types";
import { LiveCard, useDealIntro } from "./live-card";

/**
 * Phones show the same card as the stage, full text included, and mirror the
 * host's gestures. They do not control the card unless this seat is the host.
 */
export function ControllerView({
  state,
  seat,
  socket,
}: {
  state: RoomState;
  seat: Seat;
  socket: CardSocket;
}) {
  const router = useRouter();
  const intro = useDealIntro(state.status);
  const isHost = state.hostId ? state.hostId === seat.playerId : false;

  if (state.status === "LOBBY") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
        <span className="rounded-full bg-tappen-blue-800 px-4 py-1.5 text-sm font-bold text-tappen-sunset-300">
          {state.deckName}
        </span>
        <h1 className="font-lilita-one text-3xl text-tappen-blue-50">Waiting for the host…</h1>
        <p className="max-w-xs text-tappen-blue-300">
          When the host draws, the card shows up here — the same one as the stage.
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

  // ACTIVE — full card, view-only unless this phone is the host seat.
  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-center text-tappen-blue-100">
      <div className="flex shrink-0 items-center justify-center gap-2 px-4 pb-1 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <span className="rounded-full bg-tappen-blue-800 px-4 py-1.5 text-sm font-bold text-tappen-sunset-300">
          {state.deckName}
          {state.turn ? ` · turn ${state.turn.sequence}` : ""}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-tappen-blue-800 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-tappen-blue-200">
          <span className="size-1.5 animate-pulse rounded-full bg-tappen-green-400" />
          live
        </span>
      </div>
      {state.turn ? (
        <LiveCard
          content={state.turn.content}
          skinId={state.turn.skinId}
          sequence={state.turn.sequence}
          interactive={isHost}
          canAdvance={isHost && seat.role === "STAGE"}
          intro={intro}
          socket={socket}
          onAdvance={async () => undefined}
        />
      ) : (
        <p className="flex flex-1 items-center justify-center px-8 text-tappen-blue-300">
          Waiting for the first card.
        </p>
      )}
      <p className="shrink-0 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm text-tappen-blue-300">
        {isHost ? "you are moving the card" : "following the host"}
      </p>
    </div>
  );
}
