"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { CardSocket, RoomState, Seat } from "./types";
import { forgetSeat } from "./seat";
import { LiveCard, useDealIntro, type LiveCardHandle } from "./live-card";

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; the code is on screen anyway
    }
  }, [code]);

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-2xl border-4 border-dashed border-tappen-sunset-400 bg-tappen-blue-900/60 px-8 py-6 text-center transition active:scale-95"
    >
      <div className="text-sm uppercase tracking-widest text-tappen-sunset-300">
        {copied ? "copied!" : "join code"}
      </div>
      <div className="font-lilita-one mt-1 text-6xl tracking-[0.2em] text-tappen-blue-50">
        {code}
      </div>
    </button>
  );
}

function PlayerList({ state, seat }: { state: RoomState; seat: Seat }) {
  return (
    <ul className="flex w-full max-w-md flex-wrap items-center justify-center gap-2">
      {state.players.map((p) => {
        const isMe = p.id === seat.playerId;
        return (
          <li
            key={p.id}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
              p.role === "STAGE"
                ? "bg-tappen-purple-500 text-tappen-purple-50"
                : "bg-tappen-blue-800 text-tappen-blue-200"
            } ${isMe ? "ring-2 ring-tappen-sunset-400" : ""}`}
          >
            <span
              className={`size-2 rounded-full ${
                p.isConnected ? "bg-tappen-green-400" : "bg-tappen-blue-400"
              }`}
            />
            {p.displayName}
            {p.role === "STAGE" && <span className="text-xs opacity-70">stage</span>}
          </li>
        );
      })}
    </ul>
  );
}

function isHostSeat(state: RoomState, seat: Seat) {
  if (state.hostId) return state.hostId === seat.playerId;
  return seat.role === "STAGE";
}

export function StageView({
  state,
  seat,
  token,
  socket,
}: {
  state: RoomState;
  seat: Seat;
  token: string;
  socket: CardSocket;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const intro = useDealIntro(state.status);
  const cardRef = useRef<LiveCardHandle>(null);
  const isHost = isHostSeat(state, seat);

  const advance = api.room.advance.useMutation({
    onSettled: () => setBusy(false),
  });
  const end = api.room.end.useMutation({
    onSettled: () => setBusy(false),
    onSuccess: () => {
      forgetSeat(state.roomId);
    },
  });

  const handleAdvance = () => {
    setBusy(true);
    advance.mutate({ roomId: state.roomId, token });
  };

  const requestAdvance = useCallback(async () => {
    setBusy(true);
    try {
      await advance.mutateAsync({ roomId: state.roomId, token });
    } finally {
      setBusy(false);
    }
  }, [advance, state.roomId, token]);

  const handleEnd = () => {
    setBusy(true);
    end.mutate({ roomId: state.roomId, token });
  };

  if (state.status === "LOBBY") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
        <h1 className="font-lilita-one text-4xl text-tappen-blue-50">Lobby</h1>
        <CopyCode code={state.code} />
        <p className="text-tappen-blue-300">
          Playing <span className="font-bold text-tappen-sunset-300">{state.deckName}</span>
        </p>
        <PlayerList state={state} seat={seat} />
        <button
          type="button"
          disabled={busy || state.players.length === 0}
          onClick={handleAdvance}
          className="font-lilita-one rounded-full bg-tappen-sunset-500 px-10 py-4 text-2xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400 disabled:opacity-40"
        >
          Draw the first card
        </button>
      </div>
    );
  }

  if (state.status === "ENDED") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
        <h1 className="font-lilita-one text-5xl text-tappen-sunset-400">That&apos;s a wrap</h1>
        <p className="max-w-md text-lg text-tappen-blue-300">
          Every guest who wants their name on tonight&apos;s game should open the app
          once more and claim their seat.
        </p>
        <PlayerList state={state} seat={seat} />
        <button
          type="button"
          onClick={() => {
            forgetSeat(state.roomId);
            router.push("/");
          }}
          className="font-lilita-one rounded-full bg-tappen-sunset-500 px-10 py-4 text-2xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
        >
          Back home
        </button>
      </div>
    );
  }

  // ACTIVE — the host moves the card; everyone else mirrors it.
  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 text-tappen-blue-100">
      <div className="flex w-full shrink-0 items-center justify-between gap-4 px-4 pb-2 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <span className="rounded-full bg-tappen-blue-800 px-4 py-1.5 text-sm font-bold text-tappen-sunset-300">
          {state.deckName} · turn {state.turn?.sequence ?? "?"}
        </span>
        <button
          type="button"
          onClick={handleEnd}
          disabled={busy}
          className="rounded-full bg-tappen-blue-800 px-4 py-1.5 text-sm font-bold text-tappen-blue-300 transition hover:text-tappen-sunset-400 disabled:opacity-40"
        >
          End night
        </button>
      </div>

      {state.turn ? (
        <LiveCard
          ref={cardRef}
          content={state.turn.content}
          skinId={state.turn.skinId}
          sequence={state.turn.sequence}
          interactive={isHost}
          canAdvance={isHost}
          intro={intro}
          variant="stage"
          socket={socket}
          onAdvance={requestAdvance}
        />
      ) : (
        <p className="flex flex-1 items-center justify-center text-tappen-blue-300">
          No card yet — draw the first one.
        </p>
      )}

      <div className="flex w-full shrink-0 flex-col items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <PlayerList state={state} seat={seat} />
        {isHost && state.turn && (
          <>
            <p className="text-xs uppercase tracking-widest text-tappen-blue-300">
              drag · tap to flip · swipe for the next card
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => cardRef.current?.swipeAway(1)}
              className="font-lilita-one w-full max-w-md rounded-full bg-tappen-sunset-500 py-3 text-2xl text-tappen-blue-900 transition hover:bg-tappen-sunset-400 active:scale-95 disabled:opacity-40"
            >
              Next card
            </button>
          </>
        )}
      </div>
    </div>
  );
}
