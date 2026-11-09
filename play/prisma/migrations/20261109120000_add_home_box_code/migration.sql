-- Additive migration for per-box Tappen Home redemption codes.
-- Apply after 20261102153000_add_home_order. This file only creates new
-- tables. It does not alter existing tables or rows.
-- CreateTable
CREATE TABLE `HomeBoxCode` (
    `id` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `status` ENUM('ISSUED', 'REDEEMED', 'VOID') NOT NULL DEFAULT 'ISSUED',
    `homeOrderId` VARCHAR(191) NULL,
    `redeemedByUserId` VARCHAR(191) NULL,
    `redeemedAt` DATETIME(3) NULL,
    `voidedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HomeBoxCode_codeHash_key`(`codeHash`),
    INDEX `HomeBoxCode_homeOrderId_idx`(`homeOrderId`),
    INDEX `HomeBoxCode_redeemedByUserId_idx`(`redeemedByUserId`),
    INDEX `HomeBoxCode_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HomeBoxAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `ipHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HomeBoxAttempt_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HomeBoxCode` ADD CONSTRAINT `HomeBoxCode_homeOrderId_fkey` FOREIGN KEY (`homeOrderId`) REFERENCES `HomeOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HomeBoxCode` ADD CONSTRAINT `HomeBoxCode_redeemedByUserId_fkey` FOREIGN KEY (`redeemedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
