import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { buildRoomState, getRoomCardPool, playableCardWhere } from "@/server/realtime/snapshot";
import { hub } from "@/server/realtime/hub";
import type { CardTransform } from "@/shared/card-transform";
import { logIntent } from "@/server/observability";
import type { db as DbClient } from "@/server/db";

/**
 * Join codes: 6 chars from an alphabet with no visually confusable
 * characters (0/O, 1/I/L removed). Stored and queried in uppercase so the
 * case-sensitive Postgres unique index matches a code a player types.
 */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function generateRoomCode(db: typeof DbClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await db.room.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "could not allocate a room code" });
}

async function resolvePlayer(
  db: typeof DbClient,
  roomId: string,
  token: string,
) {
  const player = await db.player.findUnique({
    where: { connectionToken: token },
  });
  if (!player || player.roomId !== roomId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "not a member of this room" });
  }
  return player;
}

function assertStage(player: { role: string }) {
  if (player.role !== "STAGE") {
    throw new TRPCError({ code: "FORBIDDEN", message: "only the stage can do this" });
  }
}

async function roomView(roomId: string, role: "STAGE" | "CONTROLLER") {
  const state = await buildRoomState(roomId, role);
  if (!state) return null;
  const cardTransform: CardTransform = hub.getCardTransform(roomId);
  return { ...state, cardTransform };
}

export const roomRouter = createTRPCRouter({
  /**
   * Decks a host can start a room with (deckId null = built-in Tappen pool).
   * Deck has no visibility or sharing field — only an owner — so signed-in
   * hosts see their own decks, and anonymous hosts see none (the client
   * always offers the built-in Tappen deck). Counts match getRoomCardPool:
   * nsfw cards and non-public cards are not playable.
   */
  listDecks: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user.id;
    if (!userId) return [];

    const decks = await ctx.db.deck.findMany({
      where: {
        deletedAt: null,
        creatorId: userId,
        cards: { some: playableCardWhere },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        image: true,
        _count: { select: { cards: { where: playableCardWhere } } },
      },
    });
    return decks
      .filter((d) => d._count.cards > 0)
      .map((d) => ({
        id: d.id,
        name: d.name ?? "Untitled deck",
        image: d.image,
        cardCount: d._count.cards,
      }));
  }),

  /** Stage: create a room, become host. */
  create: publicProcedure
    .input(
      z.object({
        deckId: z.string().nullable().optional(),
        displayName: z.string().trim().min(1).max(24).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const code = await generateRoomCode(ctx.db);
      const userId = ctx.session?.user.id ?? null;

      const deck = input.deckId
        ? await ctx.db.deck.findFirst({
            where: { id: input.deckId, deletedAt: null },
            select: { id: true },
          })
        : null;
      if (input.deckId && !deck) {
        throw new TRPCError({ code: "NOT_FOUND", message: "deck not found" });
      }

      const room = await ctx.db.room.create({
        data: {
          code,
          deckId: deck?.id ?? null,
        },
      });

      const host = await ctx.db.player.create({
        data: {
          roomId: room.id,
          displayName: input.displayName?.trim() ?? (ctx.session?.user.name ?? "Stage"),
          role: "STAGE",
          userId,
        },
      });

      await ctx.db.room.update({
        where: { id: room.id },
        data: { hostId: host.id },
      });

      logIntent(host.roomId, host.id, "room.create", { deckId: deck?.id ?? null });

      const state = await roomView(host.roomId, "STAGE");
      return {
        roomId: host.roomId,
        token: host.connectionToken,
        playerId: host.id,
        state,
      };
    }),

  /** Controller (or stage): join an existing room by code. */
  join: publicProcedure
    .input(
      z.object({
        code: z.string().trim().min(1).max(12),
        displayName: z.string().trim().min(1).max(24),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const code = input.code.toUpperCase();
      const room = await ctx.db.room.findUnique({ where: { code } });
      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "no room with that code" });
      }
      if (room.status === "ENDED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "this room has ended" });
      }

      const userId = ctx.session?.user.id ?? null;

      // Signed-in users rejoin their existing seat instead of stacking up.
      if (userId) {
        const existing = await ctx.db.player.findFirst({
          where: { roomId: room.id, userId },
        });
        if (existing) {
          logIntent(room.id, existing.id, "room.join.rejoin");
          await ctx.db.player.update({
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

      const player = await ctx.db.player.create({
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
    }),

  /** Full snapshot for the player behind this token (also used on reconnect). */
  state: publicProcedure
    .input(z.object({ roomId: z.string(), token: z.string() }))
    .query(async ({ ctx, input }) => {
      const player = await resolvePlayer(ctx.db, input.roomId, input.token);
      return roomView(input.roomId, player.role);
    }),

  /** Stage only: advance to the next card. */
  advance: publicProcedure
    .input(z.object({ roomId: z.string(), token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await resolvePlayer(ctx.db, input.roomId, input.token);
      assertStage(player);

      const room = await ctx.db.room.findUnique({ where: { id: input.roomId } });
      if (!room || room.status === "ENDED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "room is not active" });
      }

      const used = await ctx.db.turn.findMany({
        where: { roomId: input.roomId },
        select: { cardId: true },
      });
      const pool = await getRoomCardPool(input.roomId);
      const usedIds = new Set(used.map((t) => t.cardId));
      const available = pool.filter((id) => !usedIds.has(id));
      const draw = available.length > 0 ? available : pool;
      if (draw.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "deck is empty" });
      }
      const picked = draw[Math.floor(Math.random() * draw.length)];
      if (!picked) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "no card drawn" });
      }
      const cardId = picked;

      const last = await ctx.db.turn.findFirst({
        where: { roomId: input.roomId },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });

      const sequence = (last?.sequence ?? 0) + 1;

      const activeTurn = await ctx.db.turn.findFirst({
        where: { roomId: input.roomId, resolvedAt: null },
        select: { id: true },
      });
      if (activeTurn) {
        await ctx.db.turn.update({
          where: { id: activeTurn.id },
          data: { resolvedAt: new Date() },
        });
      }

      await ctx.db.turn.create({
        data: {
          roomId: input.roomId,
          cardId,
          targetId: null,
          sequence,
        },
      });

      if (room.status === "LOBBY") {
        await ctx.db.room.update({
          where: { id: input.roomId },
          data: { status: "ACTIVE" },
        });
      }

      logIntent(input.roomId, player.id, "room.advance", { cardId, sequence });

      hub.beginDeal(input.roomId);
      await hub.publish(input.roomId);
      return { sequence };
    }),

  /** Stage only: end the room. */
  end: publicProcedure
    .input(z.object({ roomId: z.string(), token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await resolvePlayer(ctx.db, input.roomId, input.token);
      assertStage(player);

      const room = await ctx.db.room.findUnique({ where: { id: input.roomId } });
      if (!room || room.status === "ENDED") return;

      const now = new Date();
      await ctx.db.room.update({
        where: { id: input.roomId },
        data: { status: "ENDED", endedAt: now },
      });
      await ctx.db.turn.updateMany({
        where: { roomId: input.roomId, resolvedAt: null },
        data: { resolvedAt: now },
      });

      logIntent(input.roomId, player.id, "room.end");

      await hub.publish(input.roomId);
      return { ended: true };
    }),

  /**
   * Guest claim: attach the signed-in account to a guest seat of an ended
   * room, retroactively. Window: 7 days after room end.
   */
  claim: protectedProcedure
    .input(z.object({ roomId: z.string(), playerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const player = await ctx.db.player.findUnique({
        where: { id: input.playerId },
        include: { room: true },
      });
      if (!player || player.roomId !== input.roomId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "player not in this room" });
      }
      if (player.userId) {
        return { claimed: false, reason: "already_claimed" };
      }
      if (player.room.status !== "ENDED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "room has not ended" });
      }
      const windowMs = 7 * 24 * 60 * 60 * 1000;
      if (!player.room.endedAt || Date.now() - player.room.endedAt.getTime() > windowMs) {
        return { claimed: false, reason: "window_expired" };
      }

      await ctx.db.player.update({
        where: { id: player.id },
        data: { userId: ctx.session.user.id, claimedAt: new Date() },
      });

      logIntent(input.roomId, player.id, "room.claim", {
        converted: true,
      });

      await hub.publish(input.roomId);
      return { claimed: true };
    }),

  /** Ops telemetry: the aggregates the plan asks to track. */
  stats: protectedProcedure.query(async ({ ctx }) => {
    const rooms = await ctx.db.room.findMany({
      where: { status: "ENDED" },
      select: { createdAt: true, endedAt: true, players: { select: { userId: true } } },
    });
    const durations = rooms
      .map((r) => (r.endedAt ? r.endedAt.getTime() - r.createdAt.getTime() : null))
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b);

    const medianDuration =
      durations.length > 0
        ? durations[Math.floor(durations.length / 2)]
        : null;

    const playersPerRoom = rooms.map((r) => r.players.length);
    const avgPlayers =
      playersPerRoom.length > 0
        ? playersPerRoom.reduce((a, b) => a + b, 0) / playersPerRoom.length
        : null;

    const turnCount = await ctx.db.turn.count();
    const endedRooms = rooms.length;

    const guests = await ctx.db.player.findMany({
      where: { room: { status: "ENDED" } },
      select: { userId: true, claimedAt: true },
    });
    const converted = guests.filter((g) => g.userId !== null && g.claimedAt !== null).length;
    const conversionRate = guests.length > 0 ? converted / guests.length : null;

    return {
      medianRoomDurationMs: medianDuration,
      avgPlayersPerRoom: avgPlayers,
      turnsPerRoom: endedRooms > 0 ? turnCount / endedRooms : null,
      guestToAccount: {
        guests,
        converted,
        rate: conversionRate,
      },
    };
  }),
});
