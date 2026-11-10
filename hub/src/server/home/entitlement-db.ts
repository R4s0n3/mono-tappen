import type { PrismaClient } from "@prisma/client";

import {
  describeEntitlement,
  premiumSkinIdFromProduct,
  type EntitlementView,
} from "@/server/home/entitlement";

type EntitlementReader = Pick<PrismaClient, "subscription" | "product" | "userSkin">;

export async function loadEntitlement(
  db: EntitlementReader,
  userId: string,
): Promise<EntitlementView> {
  const [subscription, product, owned] = await Promise.all([
    db.subscription.findUnique({
      where: { userId },
      select: { status: true },
    }),
    db.product.findFirst({
      where: { name: { equals: "Premium", mode: "insensitive" }, type: "SUBSCRIPTION" },
      include: { skins: { select: { id: true } } },
    }),
    db.userSkin.findMany({
      where: { userId },
      select: { skinId: true },
    }),
  ]);

  return describeEntitlement({
    subscription,
    ownedSkinIds: owned.map((row) => row.skinId),
    premiumSkinId: premiumSkinIdFromProduct(product?.skins.map((skin) => skin.id) ?? []),
  });
}
