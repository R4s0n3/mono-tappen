import { TRPCError } from "@trpc/server";
import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { db } from "@/server/db";
import {
  checkoutAmountMatches,
  classifyRefund,
  isPurchaseType,
  skinsGrantedByPurchase,
  type PurchaseType,
} from "@/server/payment/payment-state";
import { stripe } from "@/server/payment/stripe";

type Tx = Prisma.TransactionClient;

type ResolvedProduct = {
  id: string;
  type: PurchaseType;
  skins: { id: string }[];
};

export type FulfillResult =
  | { outcome: "completed"; already: boolean }
  | { outcome: "pending" }
  | { outcome: "ignored" };

function paymentIdFromSession(session: Stripe.Checkout.Session): string | null {
  return session.metadata?.paymentId ?? session.client_reference_id ?? null;
}

function purchaseTypeFromSession(session: Stripe.Checkout.Session): PurchaseType | null {
  const type = session.metadata?.type;
  return isPurchaseType(type) ? type : null;
}

async function lockPayment(tx: Tx, paymentId: string): Promise<void> {
  await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM Payment WHERE id = ${paymentId} FOR UPDATE`;
}

async function loadProduct(productId: string): Promise<ResolvedProduct | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { skins: { select: { id: true } } },
  });
  if (!product || !isPurchaseType(product.type)) return null;
  return { id: product.id, type: product.type, skins: product.skins };
}

async function productFromCheckoutSession(sessionId: string): Promise<ResolvedProduct | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const productId = session.metadata?.productIds;
  const type = session.metadata?.type;
  if (!productId || !isPurchaseType(type)) return null;
  const product = await loadProduct(productId);
  if (!product || product.type !== type) return null;
  return product;
}

/**
 * Grants the purchased skin or premium inside the same transaction that flips
 * the payment to COMPLETED. `skipDuplicates` makes Stripe retries and the
 * success-page confirm safe when UserSkin already exists.
 */
async function grantPurchase(
  tx: Tx,
  userId: string,
  product: ResolvedProduct,
  stripeReference: string,
): Promise<void> {
  const skinIds = skinsGrantedByPurchase(
    product.type,
    product.skins.map((skin) => skin.id),
  );
  if (skinIds.length > 0) {
    await tx.userSkin.createMany({
      data: skinIds.map((skinId) => ({ userId, skinId })),
      skipDuplicates: true,
    });
  }

  if (product.type === "SUBSCRIPTION") {
    await tx.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeId: stripeReference,
        status: "active",
      },
      update: {
        stripeId: stripeReference,
        status: "active",
        endsAt: null,
      },
    });
  }
}

type OtherGrants = {
  skinIds: Set<string>;
  subscription: boolean;
};

async function grantsFromOtherPayments(userId: string, exceptPaymentId: string): Promise<OtherGrants> {
  const others = await db.payment.findMany({
    where: {
      userId,
      status: "COMPLETED",
      id: { not: exceptPaymentId },
    },
    include: { product: { include: { skins: { select: { id: true } } } } },
  });

  const grants: OtherGrants = { skinIds: new Set<string>(), subscription: false };
  for (const other of others) {
    const fromRow =
      other.product && isPurchaseType(other.product.type)
        ? { type: other.product.type, skins: other.product.skins }
        : null;
    const product = fromRow ?? (other.shopId ? await productFromCheckoutSession(other.shopId) : null);
    if (!product || !isPurchaseType(product.type)) continue;
    if (product.type === "SUBSCRIPTION") grants.subscription = true;
    for (const skinId of skinsGrantedByPurchase(
      product.type,
      product.skins.map((skin) => skin.id),
    )) {
      grants.skinIds.add(skinId);
    }
  }
  return grants;
}

async function revokePurchase(
  tx: Tx,
  userId: string,
  paymentId: string,
  product: ResolvedProduct,
  otherGrants: OtherGrants,
): Promise<void> {
  if (product.type === "SUBSCRIPTION" && !otherGrants.subscription) {
    const anotherPremium = await tx.payment.findFirst({
      where: {
        userId,
        id: { not: paymentId },
        status: "COMPLETED",
        product: { type: "SUBSCRIPTION" },
      },
      select: { id: true },
    });
    if (!anotherPremium) {
      await tx.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "canceled", endsAt: new Date() },
      });
    }
  }

  for (const skinId of skinsGrantedByPurchase(
    product.type,
    product.skins.map((skin) => skin.id),
  )) {
    if (otherGrants.skinIds.has(skinId)) continue;
    await tx.userSkin.deleteMany({ where: { userId, skinId } });
  }
}

export async function fulfillPaidCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillResult> {
  if (session.payment_status !== "paid") return { outcome: "pending" };

  const paymentId = paymentIdFromSession(session);
  const purchaseType = purchaseTypeFromSession(session);
  const productId = session.metadata?.productIds;
  if (!paymentId || !purchaseType || !productId) {
    throw new Error(`Paid checkout session ${session.id} is missing payment metadata`);
  }
  if (!checkoutAmountMatches(session)) {
    throw new Error(`Checkout session ${session.id} amount does not match the recorded price`);
  }

  const product = await loadProduct(productId);
  if (!product || product.type !== purchaseType) {
    throw new Error(`Checkout session ${session.id} does not match a ${purchaseType} product`);
  }

  return db.$transaction(async (tx) => {
    await lockPayment(tx, paymentId);
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    const metadataUser = session.metadata?.userId;
    if (metadataUser && metadataUser !== payment.userId) {
      throw new Error(`Checkout session ${session.id} does not belong to payment ${paymentId}`);
    }
    if (payment.status === "COMPLETED") return { outcome: "completed", already: true };
    if (payment.status === "REFUNDED") return { outcome: "ignored" };

    await grantPurchase(tx, payment.userId, product, session.id);
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "COMPLETED",
        shopId: session.id,
        productId: product.id,
      },
    });
    return { outcome: "completed", already: false };
  });
}

export async function markCheckoutFailed(session: Stripe.Checkout.Session): Promise<void> {
  const paymentId = paymentIdFromSession(session);
  if (!paymentId) return;
  await db.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "FAILED", shopId: session.id },
  });
}

export async function markCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  if (session.payment_status === "paid") {
    await fulfillPaidCheckoutSession(session);
    return;
  }
  const paymentId = paymentIdFromSession(session);
  if (!paymentId) return;
  await db.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "EXPIRED", shopId: session.id },
  });
}

export async function cancelOwnedCheckout(params: {
  paymentId: string;
  userId: string;
}): Promise<{ status: "CANCELLED" | "COMPLETED" | "REFUNDED" }> {
  const payment = await db.payment.findUnique({ where: { id: params.paymentId } });
  if (!payment || payment.userId !== params.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You cannot cancel this payment" });
  }
  if (payment.status === "COMPLETED" || payment.status === "REFUNDED") {
    return { status: payment.status };
  }
  if (payment.status === "CANCELLED") return { status: "CANCELLED" };

  if (payment.shopId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(payment.shopId);
      if (session.payment_status === "paid") {
        await fulfillPaidCheckoutSession(session);
        return { status: "COMPLETED" };
      }
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(payment.shopId);
      }
    } catch (error) {
      console.error("[stripe] could not expire checkout session", error);
    }
  }

  await db.payment.updateMany({
    where: {
      id: payment.id,
      userId: params.userId,
      status: { in: ["PENDING", "EXPIRED", "FAILED"] },
    },
    data: { status: "CANCELLED" },
  });
  return { status: "CANCELLED" };
}

async function resolvePaymentIdFromCharge(charge: Stripe.Charge): Promise<string | null> {
  const fromCharge = charge.metadata?.paymentId;
  if (fromCharge) return fromCharge;

  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return null;

  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (intent.metadata?.paymentId) return intent.metadata.paymentId;

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];
  return session?.metadata?.paymentId ?? session?.client_reference_id ?? null;
}

async function refundsForCharge(chargeId: string): Promise<{
  charge: Stripe.Charge;
  refunds: { status: string | null; amount: number }[];
}> {
  const charge = await stripe.charges.retrieve(chargeId, { expand: ["refunds"] });
  const listed = charge.refunds;
  const refunds = listed?.has_more
    ? (await stripe.refunds.list({ charge: chargeId, limit: 100 })).data
    : (listed?.data ?? []);
  return {
    charge,
    refunds: refunds.map((refund) => ({ status: refund.status, amount: refund.amount })),
  };
}

export async function syncChargeRefund(chargeId: string): Promise<void> {
  const { charge, refunds } = await refundsForCharge(chargeId);
  const classification = classifyRefund({
    amount: charge.amount,
    amount_refunded: charge.amount_refunded,
    refunded: charge.refunded,
    refunds,
  });
  if (classification !== "full") return;

  const paymentId = await resolvePaymentIdFromCharge(charge);
  if (!paymentId) {
    throw new Error(`Full refund on charge ${charge.id} is not linked to a payment`);
  }
  await markPaymentRefunded(paymentId);
}

async function markPaymentRefunded(paymentId: string): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { product: { include: { skins: { select: { id: true } } } } },
  });
  if (!payment) throw new Error(`Payment ${paymentId} not found`);
  if (payment.status === "REFUNDED") return;

  const product =
    payment.product && isPurchaseType(payment.product.type)
      ? { id: payment.product.id, type: payment.product.type, skins: payment.product.skins }
      : payment.shopId
        ? await productFromCheckoutSession(payment.shopId)
        : null;
  const otherGrants = product
    ? await grantsFromOtherPayments(payment.userId, payment.id)
    : { skinIds: new Set<string>(), subscription: false };

  await db.$transaction(async (tx) => {
    await lockPayment(tx, payment.id);
    const current = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!current || current.status === "REFUNDED") return;

    // Revoke even when the row never reached COMPLETED. The old confirm path
    // could insert UserSkin and then throw before updating status.
    if (product) {
      await revokePurchase(tx, current.userId, current.id, product, otherGrants);
    } else if (current.status === "COMPLETED") {
      throw new Error(`Cannot revoke payment ${payment.id} because its product is unknown`);
    }

    await tx.payment.update({
      where: { id: current.id },
      data: {
        status: "REFUNDED",
        ...(product ? { productId: product.id } : {}),
      },
    });
  });
}

export async function invoicePdfForSession(sessionId: string): Promise<string | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
  if (!invoiceId) return null;
  const invoice = await stripe.invoices.retrieve(invoiceId);
  return invoice.invoice_pdf ?? null;
}
