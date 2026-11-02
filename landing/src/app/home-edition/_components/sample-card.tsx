"use client";

import CardSkin, {
  type CardSkinItem,
} from "@/app/_components/tappen-card/_elements/card-skin";
import WaterMark from "@/app/_components/tappen-card/watermark";
import type { SamplePrompt, SampleSkin } from "@/lib/home/samples";

const SKINS: Record<SampleSkin, CardSkinItem> = {
  classic: {
    font: { type: "serif", color: "mid" },
    border: { frame: "classic", rarity: "common" },
    background: {
      type: "radial",
      colors: { primary: "#eaeaef", secondary: "#f5f5fa" },
      animation: "liquid",
    },
  },
  grove: {
    font: { type: "serif", color: "mid" },
    border: { frame: "classic", rarity: "rare" },
    background: {
      type: "radial",
      colors: {
        primary: "#d7f0dc",
        secondary: "#f4fbf6",
        highlight: "#b7e0c0",
      },
      animation: "liquid",
    },
  },
  night: {
    font: { type: "serif", color: "light" },
    border: { frame: "classic", rarity: "epic" },
    background: {
      type: "linear",
      colors: {
        primary: "#3b1156",
        secondary: "#140716",
        highlight: "#8354a1",
      },
      animation: "liquid",
    },
  },
  gold: {
    font: { type: "serif", color: "mid" },
    border: { frame: "classic", rarity: "legendary" },
    background: {
      type: "radial",
      colors: {
        primary: "#ffe3a8",
        secondary: "#fffaf0",
        highlight: "#fff4d2",
      },
      animation: "liquid",
    },
  },
};

function questionClass(text: string): string {
  if (text.length > 70) return "text-2xl leading-snug";
  if (text.length > 42) return "text-[1.7rem] leading-snug";
  return "text-3xl leading-tight";
}

export function SampleCard({ card }: { card: SamplePrompt }) {
  return (
    <div className="w-[17.5rem] max-w-full drop-shadow-2xl">
      <div className="aspect-[5/6.9] w-full">
        <CardSkin skinObject={SKINS[card.skin]}>
          <WaterMark />
          <p className={`${questionClass(card.text)} font-serif`}>
            {card.text}
          </p>
          <footer className="mt-auto flex items-center justify-between pt-4 text-xs font-bold uppercase tracking-[0.18em]">
            <span>Tappen</span>
            {card.proposed ? <span>New card</span> : <span>Original</span>}
          </footer>
        </CardSkin>
      </div>
    </div>
  );
}
