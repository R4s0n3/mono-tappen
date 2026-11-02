import type { WebSocket } from "ws";

export interface RealtimeHub {
  attach(ws: WebSocket): void;
  publish(roomId: string): Promise<void>;
}

export const hub: RealtimeHub;
