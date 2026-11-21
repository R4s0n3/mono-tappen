import { useId } from "react";
import { cardBackTone } from "@/shared/card-back";
import { TappenMark } from "./mark";

/**
 * Branded back. The skin frame supplies the gradient, pattern, and border.
 * This face adds the mark, the wordmark, and a light lattice.
 */
export function CardBack({
  fontColor,
  pattern,
}: {
  fontColor: string;
  pattern: string | null;
}) {
  const tone = cardBackTone(fontColor, pattern);
  const patternId = `tappen-back-${useId().replace(/:/g, "")}`;

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden text-center"
      style={{ containerType: "size" }}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <pattern
            id={patternId}
            width="34"
            height="34"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M17 4.5 23.2 17 17 29.5 10.8 17 Z"
              fill="none"
              stroke={tone.lattice}
              strokeWidth="0.8"
            />
            <circle cx="17" cy="17" r="1.05" fill={tone.lattice} />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill={`url(#${patternId})`}
          opacity={tone.quietLattice ? 0.16 : 0.28}
        />
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[0.7rem] rounded-sm border"
        style={{ borderColor: tone.muted, opacity: 0.45 }}
      />
      <div className="relative z-[2] flex w-full flex-col items-center px-[10cqw]">
        <TappenMark color={tone.ink} className="h-[18cqh] max-h-16 w-auto" />
        <p
          className="mt-[2cqh] font-bang uppercase leading-none"
          style={{
            color: tone.ink,
            fontSize: "clamp(1.15rem, 16cqw, 2.6rem)",
            letterSpacing: "0.14em",
          }}
        >
          Tappen
        </p>
        <div
          aria-hidden
          className="mt-[2.2cqh] flex w-[68%] max-w-[11rem] items-center gap-2"
        >
          <span
            className="h-px flex-1"
            style={{ backgroundColor: tone.muted }}
          />
          <span className="size-[1.8cqw] min-h-1.5 min-w-1.5 rotate-45 bg-tappen-sunset-500" />
          <span
            className="h-px flex-1"
            style={{ backgroundColor: tone.muted }}
          />
        </div>
        <p
          className="mt-[2cqh] font-serif leading-snug"
          style={{
            color: tone.ink,
            fontSize: "clamp(0.95rem, 6.4cqw, 1.25rem)",
          }}
        >
          Good questions.
          <br />
          Better nights.
        </p>
      </div>
    </div>
  );
}
