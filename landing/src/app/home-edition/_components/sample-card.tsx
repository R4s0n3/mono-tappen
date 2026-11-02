import type { SamplePrompt } from "@/lib/home/samples";

/**
 * Dealt face from play's stage/controller card (`rooms/live-card.tsx`)
 * on the seeded Classic skin. Copied here because landing cannot import play.
 */
const CLASSIC_FACE = {
  backgroundImage: "radial-gradient(#f5f5fa, #eaeaef)",
  backgroundSize: "300% 300%",
} as const;

function questionClass(text: string): string {
  if (text.length > 160) return "text-lg md:text-2xl";
  if (text.length > 80) return "text-2xl md:text-3xl";
  return "text-3xl md:text-4xl";
}

export function SampleCard({ card }: { card: SamplePrompt }) {
  return (
    <div className="w-[17.5rem] max-w-full">
      <div className="aspect-[5/6.9] w-full shadow-[0_18px_36px_rgba(0,0,0,0.35)] [transform-style:preserve-3d]">
        <div
          style={CLASSIC_FACE}
          className="animate-liquid fontStyle_mid relative size-full overflow-hidden rounded p-2 font-serif"
        >
          <div className="skin-border frame_classic common relative h-full w-full p-2">
            <div className="relative size-full [transform-style:preserve-3d]">
              <div className="absolute inset-0 flex flex-col justify-between [backface-visibility:hidden]">
                <p
                  className={`flex-1 overflow-hidden font-serif leading-snug ${questionClass(card.text)}`}
                >
                  {card.text}
                </p>
                <div className="mt-4 text-center text-xs uppercase tracking-widest opacity-70">
                  turn {card.turn}
                </div>
              </div>
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center rounded bg-tappen-blue-900 [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <div className="flex size-[86%] items-center justify-center rounded-sm border-2 border-dashed border-tappen-sunset-500/80">
                  <span className="font-bang text-3xl tracking-[0.28em] text-tappen-sunset-400">
                    TAPPEN
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
