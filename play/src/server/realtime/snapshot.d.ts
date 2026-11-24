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
  /** Host's equipped own skin, or null when the card keeps its shop skin. */
  playSkin: import("../../shared/own-skin.js").PlaySkin | null;
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

/** SFW, publicly visible cards — the only cards a room will draw. */
export const playableCardWhere: {
  readonly nsfw: false;
  readonly visible: "PUBLIC";
};
