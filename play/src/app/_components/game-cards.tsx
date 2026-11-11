'use client'
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ArrowPathRoundedSquareIcon, ChevronDoubleRightIcon } from "@heroicons/react/24/solid";
import TappenCard from "./tappen-card/tappen-card";
import TinderCard from "react-tinder-card";
import Modal from "./modal";
import { useTappenCardSwipeSettings } from "./tappen-card/swipe-settings";

type API = {
  swipe(dir?: 'left' | 'right' | 'up' | 'down'): Promise<void>;
  restoreCard(): Promise<void>;
}

type GameCardsProps = {
  cards: {
    skin: string,
    id: string
  }[]
  /**
   * `overlay` pins the previous/next icons over the page. That is the website.
   * `external` leaves those actions to the caller, which is how the native
   * shell keeps them out of the host/join row.
   */
  controls?: "overlay" | "external"
}

export type GameCardsHandle = {
  previous: () => Promise<void>
  next: () => Promise<void>
}

function GameCards({ cards, controls = "overlay" }: GameCardsProps, ref: React.ForwardedRef<GameCardsHandle>) {
  const [gameOver, setGameOver] = useState(false);
  const [activeCard, setActiveCard] = useState(cards.length - 1);
  const swipeSettings = useTappenCardSwipeSettings();

  const currentIndexRef = useRef(activeCard);

  // Only recreate refs array when cards.length changes
  const childRefs = useMemo(() =>
    Array(cards.length)
      .fill(0)
      .map(() => React.createRef<API>()),
    [cards.length]
  );

  // Memoize this function to prevent unnecessary re-renders
  const updateActiveCard = useCallback((val: number) => {
    setActiveCard(val);
    currentIndexRef.current = val;
  }, []);

  const canGoBack = activeCard < cards.length - 1;
  const canSwipe = activeCard >= 0;

  // Check game over condition
  useEffect(() => {
    if (activeCard === -1) {
      setGameOver(true);
    }
  }, [activeCard]);

  // Memoize event handlers to prevent unnecessary re-renders
  const swiped = useCallback((_direction: string, _cardId: string, index: number) => {
    updateActiveCard(index - 1);
  }, [updateActiveCard]);

  const outOfFrame = useCallback(async (cardId: string, idx: number) => {
    // Avoid console.log in production
    // console.log(`${cardId} (${idx}) left the screen!`, currentIndexRef.current);
    if (currentIndexRef.current === idx) {
      await childRefs[idx]?.current?.restoreCard();
    }
  }, [childRefs]);

  const swipe = useCallback(async (dir: 'left' | 'right' | 'up' | 'down') => {
    if (canSwipe && activeCard < cards.length) {
      await childRefs[activeCard]?.current?.swipe(dir);
    }
  }, [canSwipe, activeCard, cards.length, childRefs]);

  const goBack = useCallback(async () => {
    if (!canGoBack) return;
    const newIndex = activeCard + 1;
    updateActiveCard(newIndex);
    await childRefs[newIndex]?.current?.restoreCard();
  }, [canGoBack, activeCard, childRefs, updateActiveCard]);

  useImperativeHandle(ref, () => ({
    previous: goBack,
    next: () => swipe("right"),
  }), [goBack, swipe]);

  // Memoize modal content to prevent unnecessary re-renders
  const modalContent = useMemo(() => (
    <div className="absolute z-50 top-0 left-0 bg-tappen-blue-900/90 flex flex-col justify-center items-center size-full">
      <div className="w-full flex flex-col gap-4 max-w-xs rounded bg-tappen-blue-400 p-4 text-tappen-blue-50 text-center">
        <h2 className="font-bang text-3xl">Game Over</h2>
        <p>how would you like to continue?</p>
        <div className="flex gap-4 w-full justify-between">
          <button
            type="button"
            className="bg-transparent border-2 border-tappen-purple-300 p-1 rounded px-3 flex justify-center items-center hover:bg-tappen-purple-300 flex-1"
            onClick={() => {
              window?.location?.replace("?mode=tappen");
            }}
          >
            Standard
          </button>
          <button
            type="button"
            className="bg-transparent border-2 border-tappen-purple-300 p-1 flex-1 rounded px-3 flex justify-center items-center hover:bg-tappen-purple-300"
            onClick={() => {
              window?.location?.replace("?mode=discover");
            }}
          >
            Discover
          </button>
        </div>
      </div>
    </div>
  ), []);

  return (
    <div className={controls === "external"
      ? "native-card-stage absolute inset-0 flex min-h-0 w-full items-center justify-center"
      : "flex min-h-96 justify-center items-center w-full h-full"}>
      <Modal selector="modal-hook" show={gameOver}>
        {modalContent}
      </Modal>
      <div aria-hidden={controls === "external" ? true : undefined} className={controls === "external"
        ? "pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-2 text-center"
        : "p-2 flex flex-col justify-center items-center text-center"}>
        <h2>Game Over?</h2>
        <p>Refresh the page to shuffle your cards.</p>
      </div>
      {cards.slice(
        Math.max(0, activeCard - 1),  // Prevent negative start index
        activeCard + 2  // Show max 2 cards (current + 1 ahead)
      ).map((card, index) => {
        const originalIndex = Math.max(0, activeCard - 1) + index;
        return (
          <TinderCard
            ref={childRefs[originalIndex]}
            className={`absolute tappen-swipe-card ${activeCard === originalIndex ? "z-40" : "z-30"}`}
            flickOnSwipe={swipeSettings.flickOnSwipe}
            key={card.id}
            swipeRequirementType={swipeSettings.swipeRequirementType}
            swipeThreshold={swipeSettings.swipeThreshold}
            preventSwipe={swipeSettings.preventSwipe}
            onSwipe={(dir) => swiped(dir, card.id, originalIndex)}
            onCardLeftScreen={() => outOfFrame(card.id, originalIndex)}
          >
            <div className="w-full min-w-80 max-w-xs transform-gpu will-change-transform">
              <TappenCard card={card.id} skin={card.skin} />
            </div>
          </TinderCard>
        );
      })}

      {controls === "overlay" ? (
        <div className="w-full flex justify-center items-center absolute bottom-6 px-4">
          <div className="w-full flex max-w-xl justify-between">
            <button type="button" onClick={goBack}>
              <ArrowPathRoundedSquareIcon className="size-8" />
            </button>
            <button type="button" onClick={() => swipe("right")}>
              <ChevronDoubleRightIcon className="size-8" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default React.forwardRef(GameCards);
