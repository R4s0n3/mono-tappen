import { z } from "zod";

import { revokeAppleRefreshToken } from "@/server/auth/apple-client";
import { AppleTokenError } from "@/server/auth/apple-token";
import { deleteNativeAccount } from "@/server/auth/delete-account";
import { eraseUserAccount, loadAppleJwks, signInWithAppleIdentity } from "@/server/auth/native-session";
import { confirmSignedPremium, restoreSignedPremium } from "@/server/iap/claim-premium";
import { PremiumPurchaseError } from "@/server/iap/premium";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { loadEntitlement } from "@/server/home/entitlement-db";
import { TRPCError } from "@trpc/server";

function premiumError(error: unknown): never {
  if (error instanceof PremiumPurchaseError) {
    if (error.message === "config") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Premium verification is not configured.",
      });
    }
    if (error.message === "bound") {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This purchase is already on another account.",
      });
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: "Could not verify this purchase." });
  }
  throw error;
}

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
          keys = await loadAppleJwks(fetch, { force: true });
          return await signInWithAppleIdentity(ctx.db, input, { keys });
        }
      } catch (error) {
        if (error instanceof AppleTokenError) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Could not sign in with Apple." });
        }
        throw error;
      }
    }),

  /**
   * Confirm a StoreKit 2 non-consumable with the App Store Server API and
   * turn on the same Premium flag the website and box codes use.
   */
  purchasePremium: protectedProcedure
    .input(z.object({ signedTransaction: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const outcome = await confirmSignedPremium(ctx.db, ctx.session.user.id, input.signedTransaction);
        return { premium: true as const, outcome };
      } catch (error) {
        premiumError(error);
      }
    }),

  restorePremium: protectedProcedure
    .input(z.object({ signedTransactions: z.array(z.string().min(1)).min(1).max(8) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const outcome = await restoreSignedPremium(ctx.db, ctx.session.user.id, input.signedTransactions);
        return { premium: true as const, outcome };
      } catch (error) {
        premiumError(error);
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
