/*
  Warnings:

  - You are about to drop the `purchase_invoice` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `faktur` to the `good_receipt_code` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invoice_name` to the `good_receipt_code` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `purchase_invoice` DROP FOREIGN KEY `purchase_invoice_good_receipt_code_id_fkey`;

-- DropForeignKey
ALTER TABLE `purchase_invoice` DROP FOREIGN KEY `purchase_invoice_ibfk_1`;

-- DropForeignKey
ALTER TABLE `purchase_invoice` DROP FOREIGN KEY `purchase_invoice_ibfk_3`;

-- AlterTable
ALTER TABLE `good_receipt_code` ADD COLUMN `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `faktur` VARCHAR(191) NOT NULL,
    ADD COLUMN `invoice_name` VARCHAR(191) NOT NULL,
    ADD COLUMN `is_paid` BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE `purchase_invoice`;
