import { type Prisma, type PrismaClient } from "@prisma/client";

import type { AccountRecord, BoxCodeRecord, BoxStore, BoxTx } from "@/server/home/box-code";
import { premiumSkinIdFromProduct } from "@/server/home/entitlement";

type Tx = Prisma.TransactionClient;

function sameTime(left: Date | null, right: Date | null): boolean {
  return (left?.getTime() ?? null) === (right?.getTime() ?? null);
}

function toRecord(row: {
  id: string;
  codeHash: string;
  status: BoxCodeRecord["status"];
  homeOrderId: string | null;
  redeemedByUserId: string | null;
  redeemedAt: Date | null;
  voidedAt: Date | null;
}): BoxCodeRecord {
  return {
    id: row.id,
    codeHash: row.codeHash,
    status: row.status,
    homeOrderId: row.homeOrderId,
    redeemedByUserId: row.redeemedByUserId,
    redeemedAt: row.redeemedAt,
    voidedAt: row.voidedAt,
  };
}

function prismaTx(tx: Tx): BoxTx {
  return {
    async findCode(codeHash) {
      const row = await tx.homeBoxCode.findUnique({ where: { codeHash } });
      return row ? toRecord(row) : null;
    },
    async lockCode(codeHash) {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM HomeBoxCode WHERE codeHash = ${codeHash} FOR UPDATE
      `;
      const id = locked[0]?.id;
      if (!id) return null;
      const row = await tx.homeBoxCode.findUnique({ where: { id } });
      return row ? toRecord(row) : null;
    },
    async markRedeemed(id, userId, at) {
      const updated = await tx.homeBoxCode.updateMany({
        where: { id, status: "ISSUED" },
        data: {
          status: "REDEEMED",
          redeemedByUserId: userId,
          redeemedAt: at,
        },
      });
      return updated.count === 1;
    },
    async readAccount(userId) {
      const [subscription, skins] = await Promise.all([
        tx.subscription.findUnique({ where: { userId } }),
        tx.userSkin.findMany({
          where: { userId },
          select: { skinId: true, acquiredAt: true },
        }),
      ]);
      return {
        subscription: subscription
          ? {
              status: subscription.status,
              stripeId: subscription.stripeId,
              endsAt: subscription.endsAt,
            }
          : null,
        skins,
      };
    },
    async writeAccount(userId, next: AccountRecord) {
      const current = await tx.subscription.findUnique({ where: { userId } });
      const desired = next.subscription;
      if (desired && !current) {
        await tx.subscription.create({
          data: {
            userId,
            stripeId: desired.stripeId,
            status: desired.status,
            endsAt: desired.endsAt,
          },
        });
      } else if (
        desired &&
        current &&
        (current.status !== desired.status || !sameTime(current.endsAt, desired.endsAt))
      ) {
        await tx.subscription.update({
          where: { userId },
          data: {
            status: desired.status,
            endsAt: desired.endsAt,
          },
        });
      }

      const owned = await tx.userSkin.findMany({
        where: { userId },
        select: { skinId: true },
      });
      const have = new Set(owned.map((row) => row.skinId));
      const missing = next.skins.filter((skin) => !have.has(skin.skinId));
      if (missing.length > 0) {
        await tx.userSkin.createMany({
          data: missing.map((skin) => ({ userId, skinId: skin.skinId })),
          skipDuplicates: true,
        });
      }
    },
    async premiumSkinId() {
      const product = await tx.product.findFirst({
        where: { name: "Premium", type: "SUBSCRIPTION" },
        include: { skins: { select: { id: true } } },
      });
      return premiumSkinIdFromProduct(product?.skins.map((skin) => skin.id) ?? []);
    },
    async countActiveCodes(homeOrderId) {
      return tx.homeBoxCode.count({
        where: {
          homeOrderId,
          status: { in: ["ISSUED", "REDEEMED"] },
        },
      });
    },
    async lockOrder(id) {
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM HomeOrder WHERE id = ${id} FOR UPDATE
      `;
      if (!locked[0]) return null;
      return tx.homeOrder.findUnique({
        where: { id },
        select: { id: true, status: true, quantity: true },
      });
    },
    async insertCodes(rows) {
      await tx.homeBoxCode.createMany({
        data: rows.map((row) => ({
          id: row.id,
          codeHash: row.codeHash,
          status: "ISSUED" as const,
          homeOrderId: row.homeOrderId,
        })),
      });
    },
    async voidIssued(homeOrderId, at) {
      const updated = await tx.homeBoxCode.updateMany({
        where: { homeOrderId, status: "ISSUED" },
        data: { status: "VOID", voidedAt: at },
      });
      return updated.count;
    },
    async countFailures(ipHash, since) {
      return tx.homeBoxAttempt.count({
        where: { ipHash, createdAt: { gte: since } },
      });
    },
    async recordFailure(ipHash, at) {
      await tx.homeBoxAttempt.create({
        data: { ipHash, createdAt: at },
      });
    },
  };
}

export function createPrismaBoxStore(db: PrismaClient): BoxStore {
  return {
    transaction(fn) {
      return db.$transaction((tx) => fn(prismaTx(tx)));
    },
  };
}
