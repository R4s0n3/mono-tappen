-- Binds one App Store Premium purchase to one Tappen account.
-- Apply with: npx prisma migrate deploy

CREATE TABLE "AppleIapPurchase" (
    "id" TEXT NOT NULL,
    "originalTransactionId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleIapPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppleIapPurchase_originalTransactionId_key" ON "AppleIapPurchase"("originalTransactionId");
CREATE UNIQUE INDEX "AppleIapPurchase_userId_key" ON "AppleIapPurchase"("userId");

ALTER TABLE "AppleIapPurchase" ADD CONSTRAINT "AppleIapPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
