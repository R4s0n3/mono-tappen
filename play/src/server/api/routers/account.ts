import { z } from "zod";

import { revokeAppleRefreshToken } from "@/server/auth/apple-client";
import { AppleTokenError } from "@/server/auth/apple-token";
import { deleteNativeAccount } from "@/server/auth/delete-account";
import { clearAppleJwksCache, eraseUserAccount, loadAppleJwks, signInWithAppleIdentity } from "@/server/auth/native-session";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { loadEntitlement } from "@/server/home/entitlement-db";
import { TRPCError } from "@trpc/server";

export const accountRouter = createTRPCRouter({
  entitlement: protectedProcedure.query(({ ctx }) => {
    return loadEntitlement(ctx.db, ctx.session.user.id);
  }),

  /**
   * Verify an Apple identity token and issue a bearer token. The raw token is
   * returned once. Only its hash is stored.
   */
  signInWithApple: publicProcedure
    .input(
      z.object({
        identityToken: z.string().min(1),
        nonce: z.string().min(8),
        authorizationCode: z.string().min(1).nullish(),
        givenName: z.string().max(80).nullish(),
        familyName: z.string().max(80).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        let keys = await loadAppleJwks(fetch);
        try {
          return await signInWithAppleIdentity(ctx.db, input, { keys });
        } catch (error) {
          if (!(error instanceof AppleTokenError) || error.message !== "key") throw error;
          clearAppleJwksCache();
          keys = await loadAppleJwks(fetch);
          return await signInWithAppleIdentity(ctx.db, input, { keys });
        }
      } catch (error) {
        if (error instanceof AppleTokenError) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Could not sign in with Apple." });
        }
        throw error;
      }
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { id: true, name: true, email: true, deletedAt: true },
    });
    if (!user || user.deletedAt) throw new TRPCError({ code: "UNAUTHORIZED" });
    return { id: user.id, name: user.name, email: user.email };
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.bearerTokenHash) {
      await ctx.db.bearerToken.deleteMany({ where: { tokenHash: ctx.bearerTokenHash } });
    }
    return { signedOut: true };
  }),

  /**
   * Delete the signed-in account. Orders keep their amounts. The person is removed.
   * Apple revoke runs when the Sign in with Apple key is configured.
   */
  delete: protectedProcedure
    .input(z.object({ confirm: z.literal("DELETE") }))
    .mutation(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const apple = await ctx.db.appleSignIn.findUnique({
        where: { userId },
        select: { refreshToken: true },
      });
      const appleRevoke = await deleteNativeAccount({
        refreshToken: apple?.refreshToken ?? null,
        revoke: (refreshToken) => revokeAppleRefreshToken(refreshToken),
        erase: () => eraseUserAccount(ctx.db, userId, new Date()),
      });
      return { deleted: true, appleRevoke };
    }),
});
