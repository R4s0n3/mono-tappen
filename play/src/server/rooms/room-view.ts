import type { CardTransform } from "@/shared/card-transform";
import { hub } from "@/server/realtime/hub";
import { buildRoomState } from "@/server/realtime/snapshot";

export { hub };

/** Full room snapshot plus the in-memory card pose, for either seat. */
export async function roomView(roomId: string, role: "STAGE" | "CONTROLLER") {
  const state = await buildRoomState(roomId, role);
  if (!state) return null;
  const cardTransform: CardTransform = hub.getCardTransform(roomId);
  return { ...state, cardTransform };
}
