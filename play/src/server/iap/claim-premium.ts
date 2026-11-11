import { Prisma, type PrismaClient } from "@prisma/client";

import { verifiedPremiumTransaction } from "./apple-api";
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
  const user = await tx.user.findUnique({ where: { id: userId }, select: { deletedAt: true } });
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
  return db.$transaction(async (tx): Promise<"restored"> => {
    const winner = await tx.appleIapPurchase.findUnique({
      where: { originalTransactionId: transaction.originalTransactionId },
    });
    if (winner && winner.userId !== userId) throw new PremiumPurchaseError("bound");
    const account = await readSnapshot(tx, userId, transaction.originalTransactionId);
    const plan = planPremiumClaim({ userId, transaction, account });
    if (plan.outcome === "bound-to-other-account") throw new PremiumPurchaseError("bound");
    await applyPlan(tx, userId, { ...plan, createPurchase: null });
    return "restored";
  });
}

export async function restoreSignedPremium(
  db: PrismaClient,
  userId: string,
  signedTransactions: string[],
  deps: Parameters<typeof verifiedPremiumTransaction>[1] = {},
): Promise<"granted" | "restored"> {
  if (signedTransactions.length === 0) throw new PremiumPurchaseError("product");
  let bound = false;
  let firstError: PremiumPurchaseError | null = null;
  for (const signedTransaction of signedTransactions) {
    try {
      return await confirmSignedPremium(db, userId, signedTransaction, deps);
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
  if (bound) throw new PremiumPurchaseError("bound");
  throw firstError ?? new PremiumPurchaseError("product");
}

export async function confirmSignedPremium(
  db: PrismaClient,
  userId: string,
  signedTransaction: string,
  deps: Parameters<typeof verifiedPremiumTransaction>[1] = {},
): Promise<"granted" | "restored"> {
  const transaction = await verifiedPremiumTransaction(signedTransaction, deps);
  return claimVerifiedPremium(db, userId, transaction);
}
