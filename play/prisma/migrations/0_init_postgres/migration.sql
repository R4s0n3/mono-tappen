-- PostgreSQL baseline. Matches production MySQL after 20261109120000_add_home_box_code.
-- Index names end in _idx so they do not collide with foreign-key constraint names.
-- Apply with: npx prisma migrate deploy

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('common', 'rare', 'epic', 'legendary');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'SHARED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SKIN', 'BUNDLE', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('LOBBY', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('STAGE', 'CONTROLLER');

-- CreateEnum
CREATE TYPE "HomeOrderStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'SHIPPED');

-- CreateEnum
CREATE TYPE "HomeBoxCodeStatus" AS ENUM ('ISSUED', 'REDEEMED', 'VOID');

-- CreateTable
CREATE TABLE "SkinFont" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "SkinFont_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinBorder" (
    "id" TEXT NOT NULL,
    "frame" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,

    CONSTRAINT "SkinBorder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkinBackground" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "animation" TEXT NOT NULL,
    "primary" TEXT NOT NULL,
    "secondary" TEXT NOT NULL,
    "highlight" TEXT,

    CONSTRAINT "SkinBackground_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "skinBackgroundId" TEXT NOT NULL,
    "skinBorderId" TEXT NOT NULL,
    "skinFontId" TEXT NOT NULL,

    CONSTRAINT "Skin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkin_pkey" PRIMARY KEY ("userId","skinId")
);

-- CreateTable
CREATE TABLE "Card" (
    "idx" SERIAL NOT NULL,
    "cardId" TEXT NOT NULL,
    "skinId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "nsfw" BOOLEAN NOT NULL,
    "visible" "Visibility" NOT NULL,
    "health" INTEGER NOT NULL DEFAULT 1000000,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("idx")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'LOBBY',
    "hostId" TEXT,
    "deckId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "PlayerRole" NOT NULL,
    "userId" TEXT,
    "connectionToken" TEXT NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "targetId" TEXT,
    "sequence" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "last_newName" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "type" "ProductType" NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "HomeOrder" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "email" TEXT,
    "name" TEXT,
    "address" TEXT,
    "country" TEXT,
    "quantity" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "shippingAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "status" "HomeOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBoxCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "HomeBoxCodeStatus" NOT NULL DEFAULT 'ISSUED',
    "homeOrderId" TEXT,
    "redeemedByUserId" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeBoxCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBoxAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeBoxAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CardToTag" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CardToDeck" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CardLikesToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_DeckLikesToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToSkin" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Skin_skinBackgroundId_key" ON "Skin"("skinBackgroundId");

-- CreateIndex
CREATE UNIQUE INDEX "Skin_skinBorderId_key" ON "Skin"("skinBorderId");

-- CreateIndex
CREATE UNIQUE INDEX "Skin_skinFontId_key" ON "Skin"("skinFontId");

-- CreateIndex
CREATE INDEX "UserSkin_skinId_idx" ON "UserSkin"("skinId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_cardId_key" ON "Card"("cardId");

-- CreateIndex
CREATE INDEX "Card_authorId_idx" ON "Card"("authorId");

-- CreateIndex
CREATE INDEX "Card_skinId_idx" ON "Card"("skinId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Deck_creatorId_idx" ON "Deck"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Room_hostId_key" ON "Room"("hostId");

-- CreateIndex
CREATE INDEX "Room_deckId_idx" ON "Room"("deckId");

-- CreateIndex
CREATE INDEX "Room_hostId_idx" ON "Room"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_connectionToken_key" ON "Player"("connectionToken");

-- CreateIndex
CREATE INDEX "Player_roomId_idx" ON "Player"("roomId");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "Player"("userId");

-- CreateIndex
CREATE INDEX "Turn_roomId_sequence_idx" ON "Turn"("roomId", "sequence");

-- CreateIndex
CREATE INDEX "Turn_cardId_idx" ON "Turn"("cardId");

-- CreateIndex
CREATE INDEX "Turn_targetId_idx" ON "Turn"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_shopId_key" ON "Payment"("shopId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_productId_idx" ON "Payment"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "HomeOrder_stripeSessionId_key" ON "HomeOrder"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeOrder_stripePaymentIntentId_key" ON "HomeOrder"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "HomeOrder_status_idx" ON "HomeOrder"("status");

-- CreateIndex
CREATE INDEX "HomeOrder_email_idx" ON "HomeOrder"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HomeBoxCode_codeHash_key" ON "HomeBoxCode"("codeHash");

-- CreateIndex
CREATE INDEX "HomeBoxCode_homeOrderId_idx" ON "HomeBoxCode"("homeOrderId");

-- CreateIndex
CREATE INDEX "HomeBoxCode_redeemedByUserId_idx" ON "HomeBoxCode"("redeemedByUserId");

-- CreateIndex
CREATE INDEX "HomeBoxCode_status_idx" ON "HomeBoxCode"("status");

-- CreateIndex
CREATE INDEX "HomeBoxAttempt_ipHash_createdAt_idx" ON "HomeBoxAttempt"("ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_CardToTag_AB_unique" ON "_CardToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_CardToTag_B_index" ON "_CardToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CardToDeck_AB_unique" ON "_CardToDeck"("A", "B");

-- CreateIndex
CREATE INDEX "_CardToDeck_B_index" ON "_CardToDeck"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CardLikesToUser_AB_unique" ON "_CardLikesToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CardLikesToUser_B_index" ON "_CardLikesToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_DeckLikesToUser_AB_unique" ON "_DeckLikesToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_DeckLikesToUser_B_index" ON "_DeckLikesToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToSkin_AB_unique" ON "_ProductToSkin"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToSkin_B_index" ON "_ProductToSkin"("B");

-- AddForeignKey
ALTER TABLE "Skin" ADD CONSTRAINT "Skin_skinBackgroundId_fkey" FOREIGN KEY ("skinBackgroundId") REFERENCES "SkinBackground"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skin" ADD CONSTRAINT "Skin_skinBorderId_fkey" FOREIGN KEY ("skinBorderId") REFERENCES "SkinBorder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skin" ADD CONSTRAINT "Skin_skinFontId_fkey" FOREIGN KEY ("skinFontId") REFERENCES "SkinFont"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkin" ADD CONSTRAINT "UserSkin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkin" ADD CONSTRAINT "UserSkin_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "Skin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_skinId_fkey" FOREIGN KEY ("skinId") REFERENCES "Skin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("cardId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeBoxCode" ADD CONSTRAINT "HomeBoxCode_homeOrderId_fkey" FOREIGN KEY ("homeOrderId") REFERENCES "HomeOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeBoxCode" ADD CONSTRAINT "HomeBoxCode_redeemedByUserId_fkey" FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToTag" ADD CONSTRAINT "_CardToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("idx") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToTag" ADD CONSTRAINT "_CardToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToDeck" ADD CONSTRAINT "_CardToDeck_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("idx") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardToDeck" ADD CONSTRAINT "_CardToDeck_B_fkey" FOREIGN KEY ("B") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardLikesToUser" ADD CONSTRAINT "_CardLikesToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Card"("idx") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CardLikesToUser" ADD CONSTRAINT "_CardLikesToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeckLikesToUser" ADD CONSTRAINT "_DeckLikesToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Deck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DeckLikesToUser" ADD CONSTRAINT "_DeckLikesToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSkin" ADD CONSTRAINT "_ProductToSkin_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToSkin" ADD CONSTRAINT "_ProductToSkin_B_fkey" FOREIGN KEY ("B") REFERENCES "Skin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

