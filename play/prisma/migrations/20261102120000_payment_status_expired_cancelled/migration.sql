-- Additive follow-up. Apply after the baseline migration from
-- branch migration-baseline-phase1 (currently play/prisma/migrations/20260815023708_phase1_rooms).
-- This file only alters Payment. It does not edit earlier migrations, so it
-- rebases as a later folder. If the baseline timestamp moves past
-- 20261102120000, rename this folder so it still sorts after the baseline.
-- Existing rows keep PENDING / COMPLETED / FAILED / REFUNDED; the new values
-- are appended to the MySQL enum.

-- AlterTable
ALTER TABLE `Payment` MODIFY `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `productId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
