"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomState } from "./types";

/**
 * Subscribes to a room's realtime channel and feeds role-scoped snapshots
 * into the component. Reconnect is handled by re-subscribing: the server
 * answers every subscribe with a full snapshot, so nothing is replayed.
 */
export function useRoomSocket(
  roomId: string | null,
  token: string | null,
  enabled: boolean,
) {
  const [state, setState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<RoomState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    if (!enabled || !roomId || !token) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${proto}//${window.location.host}/ws`);

      ws.onopen = () => {
        retries = 0;
        setConnected(true);
        ws?.send(JSON.stringify({ type: "subscribe", roomId, token }));
      };

      ws.onmessage = (event) => {
        let msg: { type: string; state?: RoomState; error?: string };
        try {
          msg = JSON.parse(event.data as string) as typeof msg;
        } catch {
          return;
        }
        if (msg.type === "state" && msg.state) {
          setState(msg.state);
          stateRef.current = msg.state;
        } else if (msg.type === "error") {
          setError(msg.error ?? "room error");
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (closed) return;
        retries += 1;
        timer = setTimeout(connect, Math.min(1000 * 2 ** retries, 10000));
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [enabled, roomId, token]);

  return { state, connected, error };
}
