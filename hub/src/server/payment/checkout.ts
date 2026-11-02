import { TRPCError } from "@trpc/server";
import type Stripe from "stripe";

import { env } from "@/env";
import { db } from "@/server/db";
import { fulfillPaidCheckoutSession } from "@/server/payment/fulfillment";
import type { PurchaseType } from "@/server/payment/payment-state";
import { stripe } from "@/server/payment/stripe";

type CheckoutLine = {
  name: string;
  description: string;
  unitAmount: number;
  productId: string;
  type: PurchaseType;
};

async function customerIdFor(email: string, userId: string): Promise<string> {
  const existingCustomers = await stripe.customers.list({ email, limit: 1 });
  const existing = existingCustomers.data[0];
  if (existing) return existing.id;

  const created = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  return created.id;
}

/**
 * Reuse an open Checkout Session for this product so a double-click or a
 * React remount does not insert another PENDING row. Retire sessions whose
 * price is stale or which Stripe has already expired.
 */
async function reusableCheckoutUrl(userId: string, line: CheckoutLine): Promise<string | null> {
  const pending = await db.payment.findFirst({
    where: {
      userId,
      productId: line.productId,
      status: "PENDING",
      shopId: { not: null },
    },
    orderBy: { purchasedAt: "desc" },
  });
  if (!pending?.shopId) return null;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(pending.shopId);
  } catch (error) {
    console.error("[stripe] could not reuse checkout session", error);
    await db.payment.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return null;
  }
  if (session.payment_status === "paid") {
    await fulfillPaidCheckoutSession(session);
    throw new TRPCError({ code: "BAD_REQUEST", message: "Payment already completed." });
  }
  if (session.status === "expired") {
    await db.payment.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    return null;
  }
  if (
    session.status === "open" &&
    session.url &&
    session.amount_total === line.unitAmount &&
    session.currency === "eur"
  ) {
    return session.url;
  }
  if (session.status === "open") {
    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (error) {
      console.error("[stripe] could not expire stale checkout session", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not start checkout. Please try again.",
      });
    }
    await db.payment.updateMany({
      where: { id: pending.id, status: "PENDING" },
      data: { status: "EXPIRED" },
    });
  }
  return null;
}

export async function startCheckout(args: {
  userId: string;
  email: string;
  line: CheckoutLine;
}): Promise<string> {
  const reused = await reusableCheckoutUrl(args.userId, args.line);
  if (reused) return reused;

  const customer = await customerIdFor(args.email, args.userId);
  const payment = await db.payment.create({
    data: {
      userId: args.userId,
      productId: args.line.productId,
      status: "PENDING",
    },
  });

  const cancelUrl = new URL(env.STRIPE_CANCEL_URL);
  cancelUrl.searchParams.set("payment_id", payment.id);

  let session: Stripe.Checkout.Session | undefined;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer,
      client_reference_id: payment.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            product_data: {
              name: args.line.name,
              description: args.line.description,
            },
            unit_amount: args.line.unitAmount,
          },
        },
      ],
      // Hosted Checkout in payment mode. Premium is a one-time unlock recorded
      // in our Subscription table; it is not a Stripe Subscription, so there
      // are no renewal invoices. invoice_creation is only valid in this mode
      // and is what the receipt page reads.
      invoice_creation: { enabled: true },
      success_url: `${env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl.toString(),
      metadata: {
        paymentId: payment.id,
        productIds: args.line.productId,
        type: args.line.type,
        userId: args.userId,
        amount: String(args.line.unitAmount),
      },
      payment_intent_data: {
        metadata: {
          paymentId: payment.id,
          productIds: args.line.productId,
          type: args.line.type,
          userId: args.userId,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    await db.payment.update({
      where: { id: payment.id },
      data: { shopId: session.id },
    });
    return session.url;
  } catch (error) {
    const openedSession = session?.status === "open" ? session : undefined;
    if (openedSession) {
      await stripe.checkout.sessions.expire(openedSession.id).catch((expireError: unknown) => {
        console.error("[stripe] could not expire checkout session after failure", expireError);
      });
    }
    await db.payment
      .updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: {
          status: openedSession ? "EXPIRED" : "FAILED",
          ...(openedSession ? { shopId: openedSession.id } : {}),
        },
      })
      .catch((updateError: unknown) => {
        console.error("[stripe] failed to record checkout failure", updateError);
      });
    console.error("[stripe] checkout session create failed", error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not start checkout. Please try again.",
    });
  }
}
