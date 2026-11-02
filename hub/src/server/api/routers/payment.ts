import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { startCheckout } from "@/server/payment/checkout";
import {
  cancelOwnedCheckout,
  fulfillPaidCheckoutSession,
  invoicePdfForSession,
} from "@/server/payment/fulfillment";
import { stripe } from "@/server/payment/stripe";

const RECENT_RECEIPTS_COUNT = 5;

function requireEmail(email: string | null | undefined): string {
  if (!email) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Add an email to your account before checking out.",
    });
  }
  return email;
}

export const paymentRouter = createTRPCRouter({
  getBill: protectedProcedure.input(z.string().min(1)).query(async ({ ctx, input }) => {
    const payment = await ctx.db.payment.findFirst({
      where: { shopId: input, userId: ctx.session.user.id },
    });
    if (!payment || (payment.status !== "COMPLETED" && payment.status !== "REFUNDED")) {
      return null;
    }
    try {
      return await invoicePdfForSession(input);
    } catch (error) {
      console.error("[stripe] receipt lookup failed", error);
      return null;
    }
  }),
  retrieve: protectedProcedure.input(z.string().min(1)).query(async ({ ctx, input }) => {
    const payment = await ctx.db.payment.findFirst({
      where: { shopId: input, userId: ctx.session.user.id },
    });
    if (!payment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
    }
    const confirmedPayment = await stripe.checkout.sessions.retrieve(input);
    return {
      status: confirmedPayment.status,
      type: confirmedPayment.metadata?.type,
      price: confirmedPayment.amount_total,
    };
  }),
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const payments = await ctx.db.payment.findMany({
      where: {
        userId: ctx.session.user.id,
        status: { not: "PENDING" },
      },
      include: { product: { select: { type: true } } },
      orderBy: { purchasedAt: "desc" },
      take: 50,
    });

    const receiptTargets = payments
      .filter(
        (payment) =>
          payment.shopId && (payment.status === "COMPLETED" || payment.status === "REFUNDED"),
      )
      .slice(0, RECENT_RECEIPTS_COUNT);

    const receipts = new Map<string, string | null>();
    await Promise.all(
      receiptTargets.map(async (payment) => {
        if (!payment.shopId) return;
        try {
          receipts.set(payment.id, await invoicePdfForSession(payment.shopId));
        } catch (error) {
          console.error("[stripe] receipt lookup failed", error);
          receipts.set(payment.id, null);
        }
      }),
    );

    return payments.map((payment) => ({
      id: payment.id,
      shopId: payment.shopId,
      purchasedAt: payment.purchasedAt,
      status: payment.status,
      type: payment.product?.type ?? null,
      receiptUrl: receipts.get(payment.id) ?? null,
    }));
  }),
  confirm: protectedProcedure
    .input(z.object({ shopId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const session = await stripe.checkout.sessions.retrieve(input.shopId);
      const paymentId = session.metadata?.paymentId ?? session.client_reference_id;
      if (!paymentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Checkout session is missing payment metadata",
        });
      }

      const payment = await ctx.db.payment.findUnique({ where: { id: paymentId } });
      if (!payment || payment.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot confirm this payment" });
      }

      const result = await fulfillPaidCheckoutSession(session);
      if (result.outcome !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment is not completed yet" });
      }
      return {
        status: "success" as const,
        message: result.already ? "payment already handled." : "Thank you for your purchase!",
      };
    }),
  cancelCheckout: protectedProcedure
    .input(z.object({ paymentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return cancelOwnedCheckout({
        paymentId: input.paymentId,
        userId: ctx.session.user.id,
      });
    }),
  createBundleIntent: protectedProcedure
    .input(z.object({ product: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const email = requireEmail(ctx.session.user.email);
      const existingProduct = await ctx.db.product.findFirst({
        where: { id: input.product, type: "BUNDLE" },
        include: { skins: true },
      });
      if (!existingProduct) {
        throw new TRPCError({ code: "NOT_FOUND", message: "product not found." });
      }

      const userSkins = await ctx.db.userSkin.findMany({
        where: { userId: ctx.session.user.id },
      });
      const boughtSkins = existingProduct.skins.filter((skin) =>
        userSkins.some((owned) => owned.skinId === skin.id),
      );
      const reducedPrice = boughtSkins.reduce((total, skin) => total + skin.price, 0);
      const totalAmount = existingProduct.price - reducedPrice;
      if (totalAmount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "amount must be positive." });
      }

      const checkoutSession = await startCheckout({
        userId: ctx.session.user.id,
        email,
        line: {
          name: existingProduct.name,
          description: existingProduct.description ?? existingProduct.name,
          unitAmount: totalAmount,
          productId: existingProduct.id,
          type: "BUNDLE",
        },
      });
      return { checkout_session: checkoutSession };
    }),
  createSubIntent: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot buy Premium for another account" });
      }
      const email = requireEmail(ctx.session.user.email);

      const hasSub = await ctx.db.subscription.findUnique({
        where: { userId: input.userId },
      });
      if (hasSub?.status === "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Subscription already purchased" });
      }

      const existingProduct = await ctx.db.product.findFirst({
        where: { name: "Premium", type: "SUBSCRIPTION" },
      });
      if (!existingProduct) {
        throw new TRPCError({ code: "NOT_FOUND", message: "product not found." });
      }
      if (existingProduct.price <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "amount must be positive." });
      }

      const checkoutSession = await startCheckout({
        userId: ctx.session.user.id,
        email,
        line: {
          name: existingProduct.name,
          description: existingProduct.description ?? existingProduct.type,
          unitAmount: existingProduct.price,
          productId: existingProduct.id,
          type: "SUBSCRIPTION",
        },
      });
      return { checkout_session: checkoutSession };
    }),
  createSkinIntent: protectedProcedure
    .input(z.object({ userId: z.string(), skin: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot buy a skin for another account" });
      }
      const email = requireEmail(ctx.session.user.email);

      const hasSkin = await ctx.db.userSkin.findFirst({
        where: { userId: ctx.session.user.id, skinId: input.skin },
      });
      if (hasSkin) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Skin already purchased" });
      }

      const existingSkin = await ctx.db.skin.findUnique({ where: { id: input.skin } });
      if (!existingSkin) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Skin not found." });
      }
      if (existingSkin.price <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "amount must be positive." });
      }

      let product = await ctx.db.product.findFirst({
        where: {
          type: "SKIN",
          skins: { some: { id: existingSkin.id } },
        },
      });
      if (!product) {
        product = await ctx.db.product.create({
          data: {
            name: existingSkin.name,
            price: existingSkin.price,
            type: "SKIN",
            skins: { connect: { id: existingSkin.id } },
          },
        });
      }

      const checkoutSession = await startCheckout({
        userId: ctx.session.user.id,
        email,
        line: {
          name: existingSkin.name,
          description: product.description ?? product.name,
          unitAmount: existingSkin.price,
          productId: product.id,
          type: "SKIN",
        },
      });
      return { checkout_session: checkoutSession };
    }),
});
