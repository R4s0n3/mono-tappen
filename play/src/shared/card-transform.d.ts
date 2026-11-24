export interface CardTransform {
  x: number;
  y: number;
  rotation: number;
  flipped: boolean;
  dragging: boolean;
  sequence: number | null;
  /** Player who currently owns the drag. Null when the card is free. */
  holderId?: string | null;
  /** Display name for the holding state. Assigned by the server. */
  holderName?: string | null;
}

export const TRANSFORM_MIN_INTERVAL_MS: number;
export const SWIPE_THRESHOLD: number;
export const HOLD_TIMEOUT_MS: number;
export const DRAG_X_MIN: number;
export const DRAG_X_MAX: number;
export const DRAG_Y_MIN: number;
export const DRAG_Y_MAX: number;
export const DRAG_ROTATION_LIMIT: number;

export function restTransform(sequence?: number | null): CardTransform;
export function dealTransform(sequence?: number | null): CardTransform;
export function flyOutTransform(
  sequence: number | null,
  direction: number,
  flipped: boolean,
): CardTransform;

export function sanitizeCardTransform(msg: unknown): CardTransform | null;
export function payloadLeaksQueue(value: unknown): boolean;

/** Stage host only. Controllers, and a stage seat who is not the host, cannot draw. */
export function canSkipOrDraw(
  player: { id?: string; role?: string } | null | undefined,
  room: { hostId?: string | null } | null | undefined,
): boolean;

/** True for socket message types that would skip or draw. The hub ignores them. */
export function isSocketAdvanceEvent(type: unknown): boolean;

export interface RelayState {
  transform: CardTransform | null;
  deferred: CardTransform | null;
  sequence: number | null;
  lastSentAt: number;
  dealPending: boolean;
  holderId: string | null;
  holderName: string | null;
  holderTouchedAt: number;
}

export function createRelayState(): RelayState;
export function markDealPending(state: RelayState): RelayState;
export function noteRoomSequence(state: RelayState, sequence: number | null): RelayState;
export function currentTransform(state: RelayState): CardTransform;

export interface CardClient {
  isHost?: boolean;
  canSkip?: boolean;
  playerId?: string;
  displayName?: string | null;
}

export type AcceptResult =
  | { kind: "error"; error: string; state: RelayState }
  | { kind: "drop"; state: RelayState }
  | { kind: "deny"; transform: CardTransform; state: RelayState }
  | { kind: "relay"; transform: CardTransform; state: RelayState }
  | { kind: "defer"; waitMs: number; state: RelayState };

export function acceptCardTransform(
  client: CardClient | null | undefined,
  msg: unknown,
  state: RelayState,
  now: number,
  holdTimeoutMs?: number,
): AcceptResult;

export interface TransformFanout {
  getTransform(roomId: string): CardTransform;
  beginDeal(roomId: string): void;
  noteSequence(roomId: string, sequence: number | null): CardTransform;
  releaseHolder(
    roomId: string,
    playerId: string,
    relay: (transform: CardTransform) => void,
    now?: number,
  ): AcceptResult;
  handle(
    roomId: string,
    client: CardClient,
    msg: unknown,
    relay: (transform: CardTransform) => void,
    now?: number,
  ): AcceptResult;
}

export function createTransformFanout(options?: { holdTimeoutMs?: number }): TransformFanout;
