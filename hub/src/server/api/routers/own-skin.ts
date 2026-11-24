import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import {
  bindPrismaOwnSkinStore,
  createOwnSkin,
  deleteOwnSkin,
  equipOwnSkin,
  listOwnSkins,
  ownSkinTrpcError,
  readEquippedOwnSkin,
  updateOwnSkin,
} from "@/shared/own-skin";

const idInput = z.object({ id: z.string().min(1).max(64) }).strict();

function fail(error: unknown): never {
  const mapped = ownSkinTrpcError(error);
  if (mapped) throw new TRPCError(mapped);
  throw error;
}

/**
 * Same own-skin API as play, on the hub session. The next hub builder calls
 * these procedures. Premium is `Subscription.status === "active"`.
 * `equipped` stays available so a saved look can keep rendering.
 */
export const ownSkinRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listOwnSkins(bindPrismaOwnSkinStore(ctx.db), ctx.session.user.id);
    } catch (error) {
      fail(error);
    }
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().max(40), config: z.unknown() }).strict())
    .mutation(async ({ ctx, input }) => {
      try {
        return await createOwnSkin(bindPrismaOwnSkinStore(ctx.db), ctx.session.user.id, input);
      } catch (error) {
        fail(error);
      }
    }),

  update: protectedProcedure
    .input(
      z
        .object({
          id: z.string().min(1).max(64),
          name: z.string().max(40).optional(),
          config: z.unknown().optional(),
        })
        .strict(),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateOwnSkin(bindPrismaOwnSkinStore(ctx.db), ctx.session.user.id, input);
      } catch (error) {
        fail(error);
      }
    }),

  delete: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    try {
      return await deleteOwnSkin(bindPrismaOwnSkinStore(ctx.db), ctx.session.user.id, input.id);
    } catch (error) {
      fail(error);
    }
  }),

  equip: protectedProcedure.input(idInput).mutation(async ({ ctx, input }) => {
    try {
      return await equipOwnSkin(bindPrismaOwnSkinStore(ctx.db), ctx.session.user.id, input.id);
    } catch (error) {
      fail(error);
    }
  }),

  equipped: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) return null;
    return readEquippedOwnSkin(bindPrismaOwnSkinStore(ctx.db), userId);
  }),
});
