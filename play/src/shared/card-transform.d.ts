export interface CardTransform {
  x: number;
  y: number;
  rotation: number;
  flipped: boolean;
  dragging: boolean;
  sequence: number | null;
}

export const TRANSFORM_MIN_INTERVAL_MS: number;
export const SWIPE_THRESHOLD: number;

export function restTransform(sequence?: number | null): CardTransform;
export function dealTransform(sequence?: number | null): CardTransform;
export function flyOutTransform(
  sequence: number | null,
  direction: number,
  flipped: boolean,
): CardTransform;

export function sanitizeCardTransform(msg: unknown): CardTransform | null;
export function payloadLeaksQueue(value: unknown): boolean;

export interface RelayState {
  transform: CardTransform | null;
  deferred: CardTransform | null;
  sequence: number | null;
  lastSentAt: number;
  dealPending: boolean;
}

export function createRelayState(): RelayState;
export function markDealPending(state: RelayState): RelayState;
export function noteRoomSequence(state: RelayState, sequence: number | null): RelayState;
export function currentTransform(state: RelayState): CardTransform;

export type AcceptResult =
  | { kind: "error"; error: string }
  | { kind: "drop"; state: RelayState }
  | { kind: "relay"; transform: CardTransform; state: RelayState }
  | { kind: "defer"; waitMs: number; state: RelayState };

export function acceptCardTransform(
  client: { isHost: boolean } | null | undefined,
  msg: unknown,
  state: RelayState,
  now: number,
): AcceptResult;

export interface TransformFanout {
  getTransform(roomId: string): CardTransform;
  beginDeal(roomId: string): void;
  noteSequence(roomId: string, sequence: number | null): CardTransform;
  handle(
    roomId: string,
    client: { isHost: boolean },
    msg: unknown,
    relay: (transform: CardTransform) => void,
    now?: number,
  ): AcceptResult;
}

export function createTransformFanout(): TransformFanout;
