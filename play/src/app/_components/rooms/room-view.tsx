"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { loadSeat } from "./seat";
import { useRoomSocket } from "./use-room-socket";
import { StageView } from "./stage-view";
import { ControllerView } from "./controller-view";
import type { Seat } from "./types";

function RoomSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700">
      <div className="size-10 animate-spin rounded-full border-4 border-tappen-blue-300 border-t-tappen-sunset-400" />
    </div>
  );
}

export function RoomView({ roomId }: { roomId: string }) {
  // localStorage is not available while the server renders this screen.
  // Reading it during render made the joined page disagree with the HTML.
  const [seat, setSeat] = useState<Seat | null | undefined>(undefined);
  useEffect(() => {
    setSeat(loadSeat(roomId));
  }, [roomId]);

  const enabled = seat != null;

  const { data: initial, isLoading } = api.room.state.useQuery(
    { roomId, token: seat?.token ?? "" },
    { enabled },
  );

  const { state, error, send, subscribeTransform, getTransform } =
    useRoomSocket(roomId, seat?.token ?? null, enabled, initial?.cardTransform);

  const socket = useMemo(
    () => ({ send, subscribeTransform, getTransform }),
    [send, subscribeTransform, getTransform],
  );

  const current = state ?? initial ?? null;

  if (seat === undefined || (isLoading && !current)) {
    return <RoomSpinner />;
  }

  if (!seat) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
        <h1 className="font-lilita-one text-3xl text-tappen-blue-50">
          You&apos;re not in this room
        </h1>
        <p className="max-w-xs text-tappen-blue-300">
          Open a fresh browser or join from your phone with the room code.
        </p>
        <Link
          href="/join"
          className="font-lilita-one rounded-full bg-tappen-sunset-500 px-8 py-3 text-lg text-tappen-blue-900"
        >
          Join a room
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 p-8 text-center text-tappen-blue-100">
        <h1 className="font-lilita-one text-3xl text-tappen-sunset-400">
          {error}
        </h1>
        <Link
          href="/"
          className="font-lilita-one rounded-full bg-tappen-sunset-500 px-8 py-3 text-lg text-tappen-blue-900"
        >
          Back home
        </Link>
      </div>
    );
  }

  if (!current) return null;

  const isStage = seat.role === "STAGE";
  return (
    <>
      {isStage ? (
        <StageView
          state={current}
          seat={seat}
          token={seat.token}
          socket={socket}
        />
      ) : (
        <ControllerView state={current} seat={seat} socket={socket} />
      )}
    </>
  );
}
