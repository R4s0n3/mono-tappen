-- Phase 1: rooms, stage + controllers, turns. Additive only: creates 3 new tables, touches no existing table or row.
-- CreateTable
CREATE TABLE `Room` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('LOBBY', 'ACTIVE', 'ENDED') NOT NULL DEFAULT 'LOBBY',
    `hostId` VARCHAR(191) NULL,
    `deckId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Room_code_key`(`code`),
    UNIQUE INDEX `Room_hostId_key`(`hostId`),
    INDEX `Room_deckId_fkey`(`deckId`),
    INDEX `Room_hostId_fkey`(`hostId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Player` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `role` ENUM('STAGE', 'CONTROLLER') NOT NULL,
    `userId` VARCHAR(191) NULL,
    `connectionToken` VARCHAR(191) NOT NULL,
    `isConnected` BOOLEAN NOT NULL DEFAULT true,
    `lastSeenAt` DATETIME(3) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `claimedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Player_connectionToken_key`(`connectionToken`),
    INDEX `Player_roomId_fkey`(`roomId`),
    INDEX `Player_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Turn` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NULL,
    `sequence` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,

    INDEX `Turn_roomId_sequence_idx`(`roomId`, `sequence`),
    INDEX `Turn_cardId_fkey`(`cardId`),
    INDEX `Turn_targetId_fkey`(`targetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Room` ADD CONSTRAINT `Room_deckId_fkey` FOREIGN KEY (`deckId`) REFERENCES `Deck`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turn` ADD CONSTRAINT `Turn_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turn` ADD CONSTRAINT `Turn_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `Card`(`cardId`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Turn` ADD CONSTRAINT `Turn_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `Player`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

