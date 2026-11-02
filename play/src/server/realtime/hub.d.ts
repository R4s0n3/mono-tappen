import type { WebSocket } from "ws";
import type { CardTransform } from "../../shared/card-transform";

export interface RealtimeHub {
  attach(ws: WebSocket): void;
  publish(roomId: string): Promise<void>;
  /** Park the next broadcast's card at the deal-in pose. Not persisted. */
  beginDeal(roomId: string): void;
  /** Last in-memory transform for late joiners and the tRPC snapshot. */
  getCardTransform(roomId: string): CardTransform;
}

export const hub: RealtimeHub;
