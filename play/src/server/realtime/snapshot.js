// @ts-nocheck
/**
 * Room state snapshots, computed server-side.
 * Stage and controllers receive the same card face (full text, skin, flags).
 * The host's drag / flip / swipe is not in this snapshot builder — the hub
 * attaches the latest in-memory `cardTransform` at send time.
 * Anonymous-queue fields (`queuedById` and anything like it) are never copied
 * onto a snapshot.
 *
 * This file is plain JS because it is loaded both by the Next.js app
 * (via the tRPC router) and by the custom server (server.js) that runs
 * the WebSocket transport in the same process.
 */
import { PrismaClient } from "@prisma/client";

/**
 * The custom server and the Next.js app are one process but two module
 * graphs (Node native vs webpack-compiled). Share the client through
 * globalThis so both graphs touch the same instance.
 */
const g = globalThis;
export const prisma =
  g.__tappenPrisma ?? (g.__tappenPrisma = new PrismaClient());

const DECK_PLAYER = "Tappen";
const DECK_EMAIL = "admio@tappen.app";

/**
 * Cards a room can draw. listDecks counts with this same predicate so the
 * host picker never offers a deck that advance will reject as empty.
 */
export const playableCardWhere = {
  nsfw: false,
  visible: "PUBLIC",
};

export function playerPublic(p) {
  return {
    id: p.id,
    displayName: p.displayName,
    role: p.role,
    isConnected: p.isConnected,
  };
}

function turnState(turn, deckName) {
  if (!turn) return null;
  return {
    sequence: turn.sequence,
    deckName,
    cardId: turn.card.cardId,
    content: turn.card.content,
    skinId: turn.card.skinId,
    nsfw: turn.card.nsfw,
    targetId: turn.targetId,
  };
}

/**
 * Full snapshot for a room. Stage and controllers see the same card.
 * `role` stays in the signature so callers stay explicit about who asked.
 * Returns null when the room does not exist.
 */
export async function buildRoomState(roomId, role) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      deck: { select: { name: true, id: true } },
      players: {
        orderBy: { joinedAt: "asc" },
        select: { id: true, displayName: true, role: true, isConnected: true },
      },
      turns: {
        orderBy: { sequence: "desc" },
        take: 1,
        include: {
          card: { select: { cardId: true, content: true, skinId: true, nsfw: true } },
        },
      },
    },
  });

  if (!room) return null;

  const currentTurn = room.turns[0] ?? null;
  const deckName = room.deck?.name ?? "Tappen";
  void role;

  return {
    roomId: room.id,
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    deckId: room.deck?.id ?? null,
    deckName,
    players: room.players.map(playerPublic),
    turn: turnState(currentTurn, deckName),
  };
}

/**
 * Returns the pool of cards a room draws from: a deck if deckId is set,
 * otherwise the built-in "Tappen" pool (same as the solo mode=tappen).
 */
export async function getRoomCardPool(roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { deckId: true },
  });
  if (!room) return [];

  if (room.deckId) {
    const cards = await prisma.card.findMany({
      where: {
        decks: { some: { id: room.deckId } },
        ...playableCardWhere,
      },
      select: { cardId: true },
    });
    return cards.map((c) => c.cardId);
  }

  const cards = await prisma.card.findMany({
    where: {
      author: {
        name: { equals: DECK_PLAYER, mode: "insensitive" },
        email: { equals: DECK_EMAIL, mode: "insensitive" },
        emailVerified: { not: null },
      },
      ...playableCardWhere,
      health: { gte: 700000 },
    },
    select: { cardId: true },
  });
  return cards.map((c) => c.cardId);
}
