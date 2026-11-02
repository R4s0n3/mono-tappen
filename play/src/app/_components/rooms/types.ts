import type { CardTransform } from "@/shared/card-transform";

export type { CardTransform };

export type RoomStatus = "LOBBY" | "ACTIVE" | "ENDED";
export type PlayerRole = "STAGE" | "CONTROLLER";

export type RoomPlayer = {
  id: string;
  displayName: string;
  role: PlayerRole;
  isConnected: boolean;
};

/**
 * Stage and controllers see the same card face. `cardTransform` is the host's
 * latest ephemeral pose (not stored). Anonymous-queue fields are never present.
 */
export type RoomState = {
  roomId: string;
  code: string;
  status: RoomStatus;
  hostId: string | null;
  deckId: string | null;
  deckName: string;
  players: RoomPlayer[];
  cardTransform?: CardTransform;
  turn: {
    sequence: number;
    deckName: string;
    cardId: string;
    content: string;
    skinId: string;
    nsfw: boolean;
    targetId: string | null;
  } | null;
};

export type Seat = {
  roomId: string;
  token: string;
  playerId: string;
  role: PlayerRole;
  displayName: string;
};

export type TransformEvent = {
  transform: CardTransform;
  snap: boolean;
};

export type CardSocket = {
  send: (payload: Record<string, unknown>) => void;
  subscribeTransform: (listener: (event: TransformEvent) => void) => () => void;
  getTransform: () => CardTransform;
};
