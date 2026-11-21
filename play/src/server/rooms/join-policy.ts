export type RoomJoinStatus = "LOBBY" | "ACTIVE" | "ENDED";

/**
 * A night can still take players after the first card is drawn.
 * Only an ended room is closed.
 */
export function joinRefusalMessage(status: RoomJoinStatus): string | null {
  if (status === "ENDED") return "this room has ended";
  return null;
}
