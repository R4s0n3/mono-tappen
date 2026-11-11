"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRuntime } from "@/client/runtime";
import { restTransform, sanitizeCardTransform, type CardTransform } from "@/shared/card-transform";
import type { RoomState, TransformEvent } from "./types";

const FATAL_ERRORS = new Set([
  "not a member of this room",
  "missing roomId or token",
  "invalid json",
]);

/**
 * Subscribes to a room's realtime channel. Room snapshots arrive as `state`.
 * The host's card pose arrives as `card.transform` and is fanned out to
 * listeners without putting every frame through React state.
 * Reconnect is a fresh subscribe: the snapshot includes the latest transform.
 */
export function useRoomSocket(
  roomId: string | null,
  token: string | null,
  enabled: boolean,
  seedTransform?: CardTransform | null,
) {
  const [state, setState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<RoomState | null>(null);
  stateRef.current = state;

  const listenersRef = useRef(new Set<(event: TransformEvent) => void>());
  const transformRef = useRef<CardTransform>(seedTransform ?? restTransform(null));
  const turnSequenceRef = useRef<number | null>(null);
  const gotSocketState = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const emit = useCallback((transform: CardTransform, snap: boolean) => {
    transformRef.current = transform;
    for (const listener of listenersRef.current) listener({ transform, snap });
  }, []);

  useEffect(() => {
    if (gotSocketState.current || !seedTransform) return;
    emit(seedTransform, true);
  }, [emit, seedTransform]);

  useEffect(() => {
    if (!enabled || !roomId || !token) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let awaitSnapshot = true;

    const connect = () => {
      if (closed) return;
      const configured = getRuntime().wsUrl;
      const url =
        configured && configured.length > 0
          ? configured
          : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
      ws = new WebSocket(url);
      wsRef.current = ws;
      awaitSnapshot = true;

      ws.onopen = () => {
        retries = 0;
        setConnected(true);
        ws?.send(JSON.stringify({ type: "subscribe", roomId, token }));
      };

      ws.onmessage = (event) => {
        let msg: {
          type?: string;
          state?: RoomState;
          transform?: unknown;
          error?: string;
        };
        try {
          msg = JSON.parse(event.data as string) as typeof msg;
        } catch {
          return;
        }

        if (msg.type === "state" && msg.state) {
          gotSocketState.current = true;
          turnSequenceRef.current = msg.state.turn?.sequence ?? null;
          setState(msg.state);
          stateRef.current = msg.state;
          const incoming = sanitizeCardTransform(msg.state.cardTransform);
          if (incoming) {
            const prev = transformRef.current;
            if (awaitSnapshot || incoming.sequence !== prev.sequence) {
              emit(incoming, true);
            }
          }
          awaitSnapshot = false;
          return;
        }

        if (msg.type === "card.transform") {
          gotSocketState.current = true;
          const incoming = sanitizeCardTransform(msg.transform);
          if (!incoming) return;
          const turnSequence = turnSequenceRef.current;
          if (
            incoming.sequence != null &&
            turnSequence != null &&
            incoming.sequence !== turnSequence
          ) {
            return;
          }
          emit(incoming, false);
          return;
        }

        if (msg.type === "error" && msg.error && FATAL_ERRORS.has(msg.error)) {
          setError(msg.error);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (wsRef.current === ws) wsRef.current = null;
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
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [emit, enabled, roomId, token]);

  const subscribeTransform = useCallback((listener: (event: TransformEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getTransform = useCallback(() => transformRef.current, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    const sock = wsRef.current;
    if (sock && sock.readyState === WebSocket.OPEN) {
      sock.send(JSON.stringify(payload));
    }
  }, []);

  return { state, connected, error, send, subscribeTransform, getTransform };
}
