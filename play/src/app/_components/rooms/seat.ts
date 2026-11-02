"use client";

import type { Seat } from "./types";

const KEY_PREFIX = "tappen.seat.";

export function saveSeat(seat: Seat) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PREFIX + seat.roomId, JSON.stringify(seat));
}

export function loadSeat(roomId: string): Seat | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_PREFIX + roomId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Seat;
    if (parsed.roomId !== roomId || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function forgetSeat(roomId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_PREFIX + roomId);
}
