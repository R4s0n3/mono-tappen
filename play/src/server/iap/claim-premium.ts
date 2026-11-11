import { Prisma, type PrismaClient } from "@prisma/client";

import { lookupPremiumTransaction, verifiedPremiumTransaction } from "./apple-api";
import { premiumSkinIdFromProduct } from "@/server/home/entitlement";
import { PremiumPurchaseError, type ApplePremiumTransaction } from "./premium";

export type PremiumAccountSnapshot = {
  purchaseByTransaction: { userId: string; originalTransactionId: string } | null;
  purchaseByUser: { userId: string; originalTransactionId: string } | null;
  subscription: { status: string; stripeId: string; endsAt: Date | null } | null;
  ownedSkinIds: string[];
  premiumSkinId: string | null;
};

export type PremiumClaimPlan = {
  outcome: "granted" | "restored" | "bound-to-other-account";
  createPurchase: {
    originalTransactionId: string;
    transactionId: string;
    userId: string;
    productId: string;
    environment: string;
  } | null;
  subscription: { action: "create" | "reactivate" | "keep"; stripeId: string } | null;
  grantSkinId: string | null;
};

/**
 * One Apple purchase (original transaction) belongs to one Tappen account.
 * An existing Stripe or box-code subscription keeps its reference. Premium
 * becomes active either way, and the Premium card skin is added when the
 * shop product has one.
 */
export function planPremiumClaim(input: {
  userId: string;
  transaction: ApplePremiumTransaction;
  account: PremiumAccountSnapshot;
}): PremiumClaimPlan {
  const { transaction, account, userId } = input;
  const ownedByTransaction = account.purchaseByTransaction;
  const ownedByUser = account.purchaseByUser;
  if (ownedByTransaction && ownedByTransaction.userId !== userId) {
    return { outcome: "bound-to-other-account", createPurchase: null, subscription: null, grantSkinId: null };
  }
  if (ownedByUser && ownedByUser.originalTransactionId !== transaction.originalTransactionId) {
    return { outcome: "bound-to-other-account", createPurchase: null, subscription: null, grantSkinId: null };
  }

  const alreadyBound = ownedByTransaction?.userId === userId;
  const existing = account.subscription;
  let subscription: PremiumClaimPlan["subscription"];
  if (!existing) {
    subscription = { action: "create", stripeId: `appstore:${transaction.originalTransactionId}` };
  } else if (existing.status === "active" && existing.endsAt == null) {
    subscription = { action: "keep", stripeId: existing.stripeId };
  } else {
    subscription = { action: "reactivate", stripeId: existing.stripeId };
  }
  const grantSkinId =
    account.premiumSkinId && !account.ownedSkinIds.includes(account.premiumSkinId) ? account.premiumSkinId : null;

  return {
    outcome: alreadyBound ? "restored" : "granted",
    createPurchase: alreadyBound
      ? null
      : {
          originalTransactionId: transaction.originalTransactionId,
          transactionId: transaction.transactionId,
          userId,
          productId: transaction.productId,
          environment: transaction.environment,
        },
    subscription,
    grantSkinId,
  };
}

export type AppleRevocationPlan = {
  markRevoked: boolean;
  cancelSubscription: boolean;
  removeSkinId: string | null;
};

/**
 * A refunded Apple purchase turns Premium off only when this account's grant
 * came from that purchase. A shop payment or a Home box keeps Premium.
 */
export function planAppleRevocation(input: {
  userId: string;
  originalTransactionId: string;
  purchase: { userId: string; originalTransactionId: string } | null;
  subscriptionStripeId: string | null;
  premiumSkinId: string | null;
  ownsPremiumSkin: boolean;
  independentPremium: boolean;
  skinKeptByAnotherGrant: boolean;
}): AppleRevocationPlan {
  const purchase = input.purchase;
  if (!purchase || purchase.userId !== input.userId || purchase.originalTransactionId !== input.originalTransactionId) {
    return { markRevoked: false, cancelSubscription: false, removeSkinId: null };
  }
  // The stored subscription reference may still be a shop id after that shop
  // payment was refunded, because the Apple grant kept Premium on. Cancel
  // whenever no shop payment and no Home box remain.
  const cancelSubscription = Boolean(input.subscriptionStripeId) && !input.independentPremium;
  const removeSkinId =
    cancelSubscription && input.ownsPremiumSkin && !input.skinKeptByAnotherGrant ? input.premiumSkinId : null;
  return { markRevoked: true, cancelSubscription, removeSkinId };
}

export async function lockAccountRow(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function readSnapshot(
  tx: Prisma.TransactionClient,
  userId: string,
  originalTransactionId: string,
): Promise<PremiumAccountSnapshot> {
  const [purchaseByTransaction, purchaseByUser, subscription, owned, product] = await Promise.all([
    tx.appleIapPurchase.findUnique({ where: { originalTransactionId } }),
    tx.appleIapPurchase.findUnique({ where: { userId } }),
    tx.subscription.findUnique({ where: { userId } }),
    tx.userSkin.findMany({ where: { userId }, select: { skinId: true } }),
    tx.product.findFirst({
      where: { name: { equals: "Premium", mode: "insensitive" }, type: "SUBSCRIPTION" },
      orderBy: { id: "asc" },
      include: { skins: { select: { id: true } } },
    }),
  ]);
  return {
    purchaseByTransaction,
    purchaseByUser,
    subscription,
    ownedSkinIds: owned.map((row) => row.skinId),
    premiumSkinId: premiumSkinIdFromProduct(product?.skins.map((skin) => skin.id) ?? []),
  };
}

async function applyPlan(tx: Prisma.TransactionClient, userId: string, plan: PremiumClaimPlan): Promise<void> {
  if (plan.createPurchase) {
    await tx.appleIapPurchase.create({ data: plan.createPurchase });
  }
  if (plan.subscription?.action === "create") {
    await tx.subscription.create({
      data: {
        userId,
        stripeId: plan.subscription.stripeId,
        status: "active",
        endsAt: null,
      },
    });
  } else if (plan.subscription?.action === "reactivate") {
    await tx.subscription.update({
      where: { userId },
      data: { status: "active", endsAt: null },
    });
  }
  if (plan.grantSkinId) {
    await tx.userSkin.createMany({
      data: [{ userId, skinId: plan.grantSkinId }],
      skipDuplicates: true,
    });
  }
}

async function claimOnce(
  tx: Prisma.TransactionClient,
  userId: string,
  transaction: ApplePremiumTransaction,
): Promise<"granted" | "restored"> {
  const locked = await tx.$queryRaw<Array<{ deletedAt: Date | null }>>`
    SELECT "deletedAt" FROM "User" WHERE "id" = ${userId} FOR UPDATE
  `;
  const user = locked[0];
  if (!user || user.deletedAt) throw new PremiumPurchaseError("account");
  const account = await readSnapshot(tx, userId, transaction.originalTransactionId);
  const plan = planPremiumClaim({ userId, transaction, account });
  if (plan.outcome === "bound-to-other-account") throw new PremiumPurchaseError("bound");
  await applyPlan(tx, userId, plan);
  return plan.outcome === "restored" ? "restored" : "granted";
}

export async function claimVerifiedPremium(
  db: PrismaClient,
  userId: string,
  transaction: ApplePremiumTransaction,
): Promise<"granted" | "restored"> {
  try {
    return await db.$transaction((tx) => claimOnce(tx, userId, transaction));
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
  }
  // The conflicting row may be the subscription a box code just created.
  // Read again and keep the Apple purchase in the plan when it is still unbound.
  return db.$transaction((tx) => claimOnce(tx, userId, transaction));
}

async function revocationSnapshot(
  tx: Prisma.TransactionClient,
  userId: string,
  originalTransactionId: string,
): Promise<{
  purchase: { userId: string; originalTransactionId: string } | null;
  subscriptionStripeId: string | null;
  premiumSkinId: string | null;
  ownsPremiumSkin: boolean;
  independentPremium: boolean;
  skinKeptByAnotherGrant: boolean;
}> {
  const [purchase, subscription, product, box, premiumPayment] = await Promise.all([
    tx.appleIapPurchase.findUnique({ where: { originalTransactionId } }),
    tx.subscription.findUnique({ where: { userId } }),
    tx.product.findFirst({
      where: { name: { equals: "Premium", mode: "insensitive" }, type: "SUBSCRIPTION" },
      orderBy: { id: "asc" },
      include: { skins: { select: { id: true } } },
    }),
    tx.homeBoxCode.findFirst({
      where: { redeemedByUserId: userId, status: "REDEEMED" },
      select: { id: true },
    }),
    tx.payment.findFirst({
      where: { userId, status: "COMPLETED", product: { type: "SUBSCRIPTION" } },
      select: { id: true },
    }),
  ]);
  const premiumSkinId = premiumSkinIdFromProduct(product?.skins.map((skin) => skin.id) ?? []);
  const owned = premiumSkinId
    ? await tx.userSkin.findUnique({ where: { userId_skinId: { userId, skinId: premiumSkinId } } })
    : null;
  const skinPayment = premiumSkinId
    ? await tx.payment.findFirst({
        where: { userId, status: "COMPLETED", product: { skins: { some: { id: premiumSkinId } } } },
        select: { id: true },
      })
    : null;
  const skinKeptByAnotherGrant = Boolean(skinPayment);
  return {
    purchase,
    subscriptionStripeId: subscription?.stripeId ?? null,
    premiumSkinId,
    ownsPremiumSkin: Boolean(owned),
    independentPremium: Boolean(box) || Boolean(premiumPayment),
    skinKeptByAnotherGrant,
  };
}

async function applyAppleRevocation(
  db: PrismaClient,
  userId: string,
  transaction: ApplePremiumTransaction,
): Promise<void> {
  if (transaction.revocationDate == null) return;
  const revokedAt = new Date(transaction.revocationDate);
  await db.$transaction(async (tx) => {
    await lockAccountRow(tx, userId);
    const account = await revocationSnapshot(tx, userId, transaction.originalTransactionId);
    const plan = planAppleRevocation({
      userId,
      originalTransactionId: transaction.originalTransactionId,
      ...account,
    });
    if (plan.markRevoked) {
      await tx.appleIapPurchase.update({
        where: { originalTransactionId: transaction.originalTransactionId },
        data: { revokedAt },
      });
    }
    if (plan.cancelSubscription) {
      await tx.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "canceled", endsAt: revokedAt },
      });
    }
    if (plan.removeSkinId) {
      await tx.userSkin.deleteMany({ where: { userId, skinId: plan.removeSkinId } });
    }
  });
}

export type PremiumConfirmResult = {
  outcome: "granted" | "restored" | "revoked";
  transactionIds: string[];
};

function preferPremiumOutcome(
  current: PremiumConfirmResult["outcome"] | null,
  next: PremiumConfirmResult["outcome"],
): PremiumConfirmResult["outcome"] {
  if (current === "granted" || next === "granted") return "granted";
  if (current === "restored" || next === "restored") return "restored";
  return "revoked";
}

export async function reconcileStoredApplePremium(
  db: PrismaClient,
  userId: string,
  deps: Parameters<typeof lookupPremiumTransaction>[2] = {},
): Promise<"unchanged" | "revoked" | "none" | "unchecked"> {
  const row = await db.appleIapPurchase.findUnique({ where: { userId } });
  if (!row) return "none";
  if (row.environment !== "Sandbox" && row.environment !== "Production") return "unchecked";
  try {
    const transaction = await lookupPremiumTransaction(row.transactionId, row.environment, deps);
    if (transaction.originalTransactionId !== row.originalTransactionId) return "unchecked";
    if (transaction.revocationDate == null) return "unchanged";
    await applyAppleRevocation(db, userId, transaction);
    return "revoked";
  } catch (error) {
    if (error instanceof PremiumPurchaseError) return "unchecked";
    throw error;
  }
}

export async function restoreSignedPremium(
  db: PrismaClient,
  userId: string,
  signedTransactions: string[],
  deps: Parameters<typeof verifiedPremiumTransaction>[1] = {},
): Promise<PremiumConfirmResult> {
  const reconciled = await reconcileStoredApplePremium(db, userId, deps);
  if (signedTransactions.length === 0) {
    if (reconciled === "revoked") return { outcome: "revoked", transactionIds: [] };
    throw new PremiumPurchaseError("product");
  }
  let outcome: PremiumConfirmResult["outcome"] | null = null;
  const transactionIds: string[] = [];
  let bound = false;
  let firstError: PremiumPurchaseError | null = null;
  for (const signedTransaction of signedTransactions) {
    try {
      const result = await confirmSignedPremium(db, userId, signedTransaction, deps);
      transactionIds.push(...result.transactionIds);
      outcome = preferPremiumOutcome(outcome, result.outcome);
    } catch (error) {
      if (!(error instanceof PremiumPurchaseError)) throw error;
      if (error.message === "config" || error.message === "account") throw error;
      if (error.message === "bound") {
        bound = true;
        continue;
      }
      if (!firstError) firstError = error;
    }
  }
  if (outcome) return { outcome, transactionIds };
  if (bound) throw new PremiumPurchaseError("bound");
  throw firstError ?? new PremiumPurchaseError("product");
}

export async function confirmSignedPremium(
  db: PrismaClient,
  userId: string,
  signedTransaction: string,
  deps: Parameters<typeof verifiedPremiumTransaction>[1] = {},
): Promise<PremiumConfirmResult> {
  const transaction = await verifiedPremiumTransaction(signedTransaction, deps);
  if (transaction.revocationDate != null) {
    await applyAppleRevocation(db, userId, transaction);
    return { outcome: "revoked", transactionIds: [transaction.transactionId] };
  }
  const outcome = await claimVerifiedPremium(db, userId, transaction);
  return { outcome, transactionIds: [transaction.transactionId] };
}
