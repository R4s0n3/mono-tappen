import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { logIntent } from "@/server/observability";
import { joinRefusalMessage } from "@/server/rooms/join-policy";
import { hub, roomView } from "@/server/rooms/room-view";
import { normalizeRoomCode } from "@/shared/room-code";

/**
 * Join by room code. An active round stays open. The returned snapshot is
 * the current turn, including the live card pose, for this new seat.
 */
export async function joinRoom(
  db: PrismaClient,
  input: { code: string; displayName: string; userId: string | null },
) {
  const code = normalizeRoomCode(input.code);
  const room = await db.room.findUnique({ where: { code } });
  if (!room) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "no room with that code",
    });
  }
  const refusal = joinRefusalMessage(room.status);
  if (refusal) {
    throw new TRPCError({ code: "BAD_REQUEST", message: refusal });
  }

  const userId = input.userId;

  // Signed-in users rejoin their existing seat instead of stacking up.
  if (userId) {
    const existing = await db.player.findFirst({
      where: { roomId: room.id, userId },
    });
    if (existing) {
      logIntent(room.id, existing.id, "room.join.rejoin");
      await db.player.update({
        where: { id: existing.id },
        data: { isConnected: true, lastSeenAt: new Date() },
      });
      const state = await roomView(room.id, existing.role);
      return {
        roomId: room.id,
        token: existing.connectionToken,
        playerId: existing.id,
        state,
      };
    }
  }

  const player = await db.player.create({
    data: {
      roomId: room.id,
      displayName: input.displayName,
      role: "CONTROLLER",
      userId,
    },
  });

  logIntent(room.id, player.id, "room.join", { code });

  await hub.publish(room.id);
  const state = await roomView(room.id, "CONTROLLER");
  return {
    roomId: room.id,
    token: player.connectionToken,
    playerId: player.id,
    state,
  };
}
