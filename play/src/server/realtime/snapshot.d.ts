export interface RoomPlayerPublic {
  id: string;
  displayName: string;
  role: "STAGE" | "CONTROLLER";
  isConnected: boolean;
}

export interface TurnState {
  sequence: number;
  deckName: string;
  cardId: string;
  content: string;
  skinId: string;
  nsfw: boolean;
  targetId: string | null;
}

export interface RoomStateBase {
  roomId: string;
  code: string;
  status: "LOBBY" | "ACTIVE" | "ENDED";
  hostId: string | null;
  deckId: string | null;
  deckName: string;
  players: RoomPlayerPublic[];
}

/** Stage and controllers receive the same card face. */
export interface RoomState extends RoomStateBase {
  turn: TurnState | null;
}

export function buildRoomState(
  roomId: string,
  role: "STAGE" | "CONTROLLER",
): Promise<RoomState | null>;

export function getRoomCardPool(roomId: string): Promise<string[]>;
