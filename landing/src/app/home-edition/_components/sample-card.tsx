import {
  ArrowUpOnSquareIcon,
  FlagIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";

import type { SamplePrompt } from "@/lib/home/samples";

/**
 * Static face of the card in play and hub:
 * `play/src/app/_components/tappen-card/tappen-card.tsx`
 * on CardSkin's default Classic skin (serif, common, classic frame).
 */
const CLASSIC_FACE = {
  backgroundImage: "radial-gradient(#f5f5fa, #eaeaef)",
  backgroundSize: "300% 300%",
} as const;

function questionClass(text: string): string {
  // Phone sizes from play's TappenCard. That component also steps the type
  // down at md because the in-app card grows with the viewport. This showcase
  // stays max-w-xs, so the phone size is the one that matches the card.
  return text.length > 42 ? "text-3xl" : "text-4xl";
}

export function SampleCard({ card }: { card: SamplePrompt }) {
  return (
    <div className="mx-auto aspect-[5/6.9] w-full min-w-0 max-w-xs">
      <div
        style={CLASSIC_FACE}
        className="fontStyle_mid relative size-full overflow-hidden rounded p-2 font-serif font-normal animate-liquid"
      >
        <div className="skin-border frame_classic common h-full w-full p-2">
          <div className="flex h-full flex-col justify-between p-4">
            <span className="mx-auto bg-blend-screen opacity-[1%] lg:mt-4">
              <Image
                className="w-5 md:w-7"
                src="/tappen_logo.svg"
                alt=""
                width={28}
                height={28}
              />
            </span>
            <p
              className={`${questionClass(card.text)} pointer-events-none select-none overflow-hidden py-1.5 font-normal`}
            >
              {card.text}
            </p>
            <footer className="mt-auto flex w-full items-center justify-between">
              <div className="select-none font-sans font-normal">
                <p className="select-none font-bold first-letter:uppercase">
                  @{card.author}
                </p>
              </div>
              <div className="flex min-w-[max-content] gap-2 text-tappen-blue-500">
                <span className="flex min-w-[2rem] items-center justify-center p-1">
                  <ArrowUpOnSquareIcon className="size-6" />
                </span>
                <span className="flex min-w-[2rem] items-center justify-center p-1">
                  <StarIcon className="size-6" />
                </span>
                <span className="flex min-w-[2rem] items-center justify-center p-1">
                  <FlagIcon className="size-6" />
                </span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
