"use client";

import TinderCard from "react-tinder-card";
import TappenCard from "./tappen-card/tappen-card";
import { useRouter } from "next/navigation";

export function StarterCard() {
  const router = useRouter();

  return (
    <TinderCard
      onSwipe={() => {
        router.push("https://play.tappen.app");
      }}
    >
      <div className={`animate-shake `}>
        <TappenCard>
          <div className="mb-6 mt-12 flex h-full flex-col justify-between">
            <p className="text-center font-bang text-4xl text-tappen-blue-500 lg:text-5xl">
              Tappen
            </p>
            <div className="flex flex-col gap-6">
              <p className="text-center font-serif text-2xl">
                A game, not therapy.
              </p>
              <span className="w-full animate-pulse text-center font-bold text-tappen-blue-500">
                swipe to play
              </span>
            </div>
          </div>
        </TappenCard>
      </div>
    </TinderCard>
  );
}
