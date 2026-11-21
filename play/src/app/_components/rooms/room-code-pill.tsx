"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const COPIED_MS = 1500;

/**
 * Write text from a click. The async clipboard API is tried first.
 * A hidden field covers mobile browsers that only allow document.execCommand.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // The gesture was rejected. Fall through to the legacy path.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Small room code for a round that is already running.
 * The lobby copies the code and does not offer a join link, so this pill
 * copies the code too. It lives in the header, outside the card, so a tap
 * does not start a drag or a swipe.
 */
export function RoomCodePill({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const copy = useCallback(async () => {
    const ok = await writeClipboard(code);
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, [code]);

  return (
    <button
      type="button"
      data-room-code-pill=""
      onClick={() => {
        void copy();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      aria-label={`Copy room code ${code}`}
      title="Copy room code"
      className="relative z-20 inline-flex shrink-0 touch-manipulation select-none items-center justify-center rounded-full bg-tappen-blue-900/80 px-2.5 py-1 text-xs font-bold text-tappen-blue-50 ring-1 ring-inset ring-white/10 transition active:scale-95"
    >
      <span
        aria-live="polite"
        className={`inline-block min-w-[4.75rem] text-center ${
          copied ? "text-tappen-sunset-300" : "tracking-[0.18em]"
        }`}
      >
        {copied ? "Copied" : code}
      </span>
    </button>
  );
}
