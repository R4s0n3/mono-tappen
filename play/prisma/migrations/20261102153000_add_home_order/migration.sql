-- Additive migration for the Tappen Home preorder (HomeOrder).
-- Apply after the baseline migration from branch migration-baseline-phase1
-- (play/prisma/migrations). This file only creates a new table. It does not
-- alter existing tables, so it can be replayed on top of a rewritten baseline.
-- CreateTable
CREATE TABLE `HomeOrder` (
    `id` VARCHAR(191) NOT NULL,
    `stripeSessionId` VARCHAR(191) NOT NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `country` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `shippingAmount` INTEGER NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'eur',
    `status` ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'SHIPPED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HomeOrder_stripeSessionId_key`(`stripeSessionId`),
    UNIQUE INDEX `HomeOrder_stripePaymentIntentId_key`(`stripePaymentIntentId`),
    INDEX `HomeOrder_status_idx`(`status`),
    INDEX `HomeOrder_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
