import { Link, useSearchParams } from "react-router-dom";

import GameCards from "@/app/_components/game-cards";
import { ModePicker } from "@/app/_components/mode-picker";

import { api } from "../platform/api";

export function HomeScreen() {
  const [params] = useSearchParams();
  const mode = params.get("mode") ?? undefined;
  const uid = params.get("uid") ?? undefined;
  const did = params.get("did") ?? undefined;
  const tid = params.get("tid") ?? undefined;
  const game = params.get("game") ?? undefined;
  const hasGameMode = [mode, uid, did, tid, game].some((value) => value !== undefined && value !== "");

  const cards = api.card.getByParams.useQuery(
    {
      mode,
      uid,
      did,
      tid: tid ? tid.split("-").filter(Boolean) : undefined,
      game: game ? game.split("-").filter(Boolean) : undefined,
    },
    { enabled: hasGameMode },
  );

  return (
    <main className="relative z-0 flex min-h-dvh flex-col items-center justify-between gap-8 overflow-hidden bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 px-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(3rem,env(safe-area-inset-top))] text-tappen-blue-200">
      <img className="w-8" width={69} height={69} alt="tappen-app-logo" src="/logo.svg" />
      <div className="flex size-full max-w-xl flex-col items-center justify-center">
        {hasGameMode && cards.isPending ? (
          <div className="size-10 animate-spin rounded-full border-4 border-tappen-blue-300 border-t-tappen-sunset-400" />
        ) : null}
        {hasGameMode && cards.isError ? (
          <p className="max-w-xs text-center text-tappen-blue-100">
            Could not load cards. Check the connection and try again.
          </p>
        ) : null}
        {hasGameMode && cards.data ? (
          <GameCards
            cards={cards.data.map((card) => ({
              id: card.cardId,
              skin: card.skinId,
            }))}
          />
        ) : null}
        {!hasGameMode ? <ModePicker /> : null}
      </div>
      <footer className="flex w-full flex-col items-center justify-center gap-2 font-sans">
        <div className="flex gap-3">
          <Link
            to="/host"
            className="rounded-full bg-tappen-sunset-500 px-6 py-2 font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400"
          >
            Host a night
          </Link>
          <Link
            to="/join"
            className="rounded-full bg-tappen-blue-800 px-6 py-2 font-bold text-tappen-blue-200 transition hover:bg-tappen-blue-700"
          >
            Join with a code
          </Link>
        </div>
      </footer>
    </main>
  );
}
