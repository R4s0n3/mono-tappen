import "server-only";

import { Prisma, type HomeOrder, type HomeOrderStatus } from "@prisma/client";
import type Stripe from "stripe";

import { HOME_PRODUCT_META } from "@/lib/home/product";
import { db } from "@/server/db";

import { stripe } from "./stripe";

export type HomeCheckoutResult =
  | { outcome: "unrelated" }
  | { outcome: "unpaid" }
  | {
      outcome: "recorded";
      id: string;
      status: HomeOrderStatus;
      email: string | null;
      name: string | null;
      quantity: number;
      amount: number;
      shippingAmount: number | null;
      country: string | null;
    };

function toRecorded(order: HomeOrder): HomeCheckoutResult {
  return {
    outcome: "recorded",
    id: order.id,
    status: order.status,
    email: order.email,
    name: order.name,
    quantity: order.quantity,
    amount: order.amount,
    shippingAmount: order.shippingAmount,
    country: order.country,
  };
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  const paymentIntent = session.payment_intent;
  if (typeof paymentIntent === "string") return paymentIntent;
  return paymentIntent?.id ?? null;
}

function readQuantity(session: Stripe.Checkout.Session): number {
  const fromLine = session.line_items?.data[0]?.quantity;
  if (
    typeof fromLine === "number" &&
    Number.isInteger(fromLine) &&
    fromLine >= 1
  ) {
    return fromLine;
  }
  const fromMeta = Number(session.metadata?.quantity ?? "");
  if (Number.isInteger(fromMeta) && fromMeta >= 1) return fromMeta;
  return 1;
}

function formatAddress(
  name: string | null | undefined,
  address: Stripe.Address | null | undefined,
): string | null {
  if (!address) return null;
  const cityLine = [address.postal_code, address.city]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ");
  const lines = [
    name,
    address.line1,
    address.line2,
    cityLine,
    address.state,
    address.country,
  ].filter((part): part is string => Boolean(part?.trim()));
  return lines.length > 0 ? lines.join("\n") : null;
}

function shippingDetails(session: Stripe.Checkout.Session) {
  return (
    session.collected_information?.shipping_details ??
    session.shipping_details ??
    null
  );
}

export async function markHomeOrderPaidFromSession(
  sessionId: string,
): Promise<HomeCheckoutResult> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  });

  if (session.metadata?.product !== HOME_PRODUCT_META) {
    return { outcome: "unrelated" };
  }
  if (session.payment_status !== "paid") {
    return { outcome: "unpaid" };
  }
  if (session.amount_total == null) {
    throw new Error("Paid checkout session is missing amount_total");
  }

  const shipping = shippingDetails(session);
  const metaShipping = Number(session.metadata.shippingAmount ?? "");
  const data = {
    stripePaymentIntentId: paymentIntentIdOf(session),
    email: session.customer_details?.email ?? null,
    name: shipping?.name ?? session.customer_details?.name ?? null,
    address: formatAddress(shipping?.name, shipping?.address ?? null),
    country: shipping?.address?.country ?? null,
    quantity: readQuantity(session),
    amount: session.amount_total,
    shippingAmount:
      session.shipping_cost?.amount_total ??
      (Number.isInteger(metaShipping) ? metaShipping : null),
    status: "PAID" as const,
  };

  const existing = await db.homeOrder.findUnique({
    where: { stripeSessionId: sessionId },
  });
  if (!existing) {
    try {
      const created = await db.homeOrder.create({
        data: { stripeSessionId: sessionId, ...data },
      });
      return toRecorded(created);
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
    }
  } else if (existing.status === "REFUNDED" || existing.status === "SHIPPED") {
    return toRecorded(existing);
  }

  await db.homeOrder.updateMany({
    where: {
      stripeSessionId: sessionId,
      status: { in: ["PENDING", "CANCELLED", "PAID"] },
    },
    data,
  });

  const updated = await db.homeOrder.findUnique({
    where: { stripeSessionId: sessionId },
  });
  if (!updated) {
    throw new Error("Home order disappeared during payment sync");
  }
  return toRecorded(updated);
}

export async function cancelUnpaidHomeCheckout(
  sessionId: string,
): Promise<void> {
  if (!sessionId.startsWith("cs_")) return;

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.product !== HOME_PRODUCT_META) return;

  if (session.payment_status === "paid") {
    await markHomeOrderPaidFromSession(sessionId);
    return;
  }

  if (session.status === "open") {
    try {
      await stripe.checkout.sessions.expire(sessionId);
    } catch (error) {
      console.error("Could not expire Tappen Home checkout", error);
    }
  }

  await db.homeOrder.updateMany({
    where: { stripeSessionId: sessionId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

export async function markHomeOrderRefunded(
  charge: Stripe.Charge,
): Promise<void> {
  const fullyRefunded =
    charge.refunded ||
    (charge.amount > 0 && charge.amount_refunded >= charge.amount);
  // Partial refunds stay PAID or SHIPPED. Stripe remains the ledger for the remainder.
  if (!fullyRefunded) return;

  const paymentIntent = charge.payment_intent;
  const paymentIntentId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
  if (!paymentIntentId) return;

  const updated = await db.homeOrder.updateMany({
    where: {
      stripePaymentIntentId: paymentIntentId,
      status: { in: ["PENDING", "PAID", "SHIPPED", "CANCELLED"] },
    },
    data: { status: "REFUNDED" },
  });
  if (updated.count > 0) return;

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];
  if (!session || session.metadata?.product !== HOME_PRODUCT_META) return;

  await db.homeOrder.updateMany({
    where: {
      stripeSessionId: session.id,
      status: { not: "REFUNDED" },
    },
    data: { status: "REFUNDED", stripePaymentIntentId: paymentIntentId },
  });
}
