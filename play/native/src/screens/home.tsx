import { useRef } from "react";
import { useSearchParams } from "react-router-dom";

import GameCards, { type GameCardsHandle } from "@/app/_components/game-cards";
import { ModePicker } from "@/app/_components/mode-picker";

import { api } from "../platform/api";
import { PlayDock } from "./play-dock";

export function HomeScreen() {
  const [params] = useSearchParams();
  const mode = params.get("mode") ?? undefined;
  const uid = params.get("uid") ?? undefined;
  const did = params.get("did") ?? undefined;
  const tid = params.get("tid") ?? undefined;
  const game = params.get("game") ?? undefined;
  const hasGameMode = [mode, uid, did, tid, game].some((value) => value !== undefined && value !== "");
  const cardsRef = useRef<GameCardsHandle>(null);

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

  const deckReady = Boolean(hasGameMode && cards.data);

  return (
    <main className="relative z-0 flex min-h-dvh flex-col items-center gap-3 overflow-hidden bg-gradient-to-b from-tappen-blue-500 to-tappen-blue-700 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] text-tappen-blue-200">
      <img className="h-8 w-8 shrink-0" width={69} height={69} alt="tappen-app-logo" src="/logo.svg" />
      <div className="relative flex min-h-0 w-full max-w-xl flex-1 flex-col items-center justify-center">
        {hasGameMode && cards.isPending ? (
          <div className="size-10 animate-spin rounded-full border-4 border-tappen-blue-300 border-t-tappen-sunset-400" />
        ) : null}
        {hasGameMode && cards.isError ? (
          <p className="max-w-xs text-center text-tappen-blue-100">
            Could not load cards. Check the connection and try again.
          </p>
        ) : null}
        {deckReady && cards.data ? (
          <GameCards
            ref={cardsRef}
            controls="external"
            cards={cards.data.map((card) => ({
              id: card.cardId,
              skin: card.skinId,
            }))}
          />
        ) : null}
        {!hasGameMode ? <ModePicker /> : null}
      </div>
      <PlayDock
        showCardControls={deckReady}
        onPrevious={() => void cardsRef.current?.previous()}
        onNext={() => void cardsRef.current?.next()}
      />
    </main>
  );
}
