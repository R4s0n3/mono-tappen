export type RoomStatus = "LOBBY" | "ACTIVE" | "ENDED";
export type PlayerRole = "STAGE" | "CONTROLLER";

export type RoomPlayer = {
  id: string;
  displayName: string;
  role: PlayerRole;
  isConnected: boolean;
};

/**
 * The stage sees the full card; controllers never do. The server decides
 * which fields exist, so the client type keeps card text optional.
 */
export type RoomState = {
  roomId: string;
  code: string;
  status: RoomStatus;
  hostId: string | null;
  deckId: string | null;
  deckName: string;
  players: RoomPlayer[];
  turn: {
    sequence: number;
    deckName: string;
    cardId?: string;
    content?: string;
    skinId?: string;
    nsfw?: boolean;
    targetId?: string | null;
  } | null;
};

export type Seat = {
  roomId: string;
  token: string;
  playerId: string;
  role: PlayerRole;
  displayName: string;
};
