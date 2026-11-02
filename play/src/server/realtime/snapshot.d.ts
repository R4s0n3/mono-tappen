export interface RoomPlayerPublic {
  id: string;
  displayName: string;
  role: "STAGE" | "CONTROLLER";
  isConnected: boolean;
}

export interface ControllerTurnState {
  sequence: number;
  deckName: string;
}

export interface StageTurnState extends ControllerTurnState {
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

export interface StageRoomState extends RoomStateBase {
  turn: StageTurnState | null;
}

export interface ControllerRoomState extends RoomStateBase {
  turn: ControllerTurnState | null;
}

export function buildRoomState(
  roomId: string,
  role: "STAGE" | "CONTROLLER",
): Promise<(StageRoomState | ControllerRoomState) | null>;

export function getRoomCardPool(roomId: string): Promise<string[]>;

/** SFW, publicly visible cards — the only cards a room will draw. */
export const playableCardWhere: {
  readonly nsfw: false;
  readonly visible: "PUBLIC";
};
