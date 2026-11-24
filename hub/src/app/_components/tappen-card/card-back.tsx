import { useId } from "react";
import { cardBackTone, type CardBackInput } from "@/shared/card-back";
import { TAPPEN_MARK_PATHS } from "./mark";

/**
 * Solid skin color, then the spark. A soft diagonal streak crosses the mark
 * so it reads as gloss, while the rest of the symbol stays flat.
 * No words. The equipped skin supplies the colors.
 */
export function CardBack({
  primary,
  secondary,
  highlight,
  rarity,
}: CardBackInput) {
  const tone = cardBackTone({ primary, secondary, highlight, rarity });
  const rawId = useId().replace(/:/g, "");
  const maskId = `tappen-mark-${rawId}`;
  const streakId = `tappen-streak-${rawId}`;
  const peak = tone.gloss > 0.7 ? 0.9 : 0.62;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded"
      style={{ backgroundColor: tone.fill }}
    >
      <svg
        aria-hidden
        viewBox="0 0 250 345"
        className="absolute inset-0 h-full w-full"
      >
        <svg x="58" y="68" width="134" height="208" viewBox="0 0 267.09 413.73">
          <defs>
            <mask id={maskId}>
              <rect width="267.09" height="413.73" fill="black" />
              <g fill="white">
                {TAPPEN_MARK_PATHS.map((d) => (
                  <path key={d.slice(0, 16)} d={d} />
                ))}
              </g>
            </mask>
            <linearGradient
              id={streakId}
              gradientUnits="userSpaceOnUse"
              x1="20"
              y1="70"
              x2="250"
              y2="250"
            >
              <stop offset="0" stopColor={tone.glossTint} stopOpacity="0" />
              <stop
                offset="0.42"
                stopColor={tone.glossTint}
                stopOpacity={peak}
              />
              <stop
                offset="0.58"
                stopColor={tone.glossTint}
                stopOpacity="0.12"
              />
              <stop offset="1" stopColor="#14151f" stopOpacity="0.28" />
            </linearGradient>
          </defs>
          <g mask={`url(#${maskId})`}>
            <rect width="267.09" height="413.73" fill={tone.symbol} />
            <rect width="267.09" height="413.73" fill={`url(#${streakId})`} />
          </g>
        </svg>
      </svg>
    </div>
  );
}
