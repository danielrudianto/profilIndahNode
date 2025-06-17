/*
  Warnings:

  - You are about to drop the column `item_id` on the `adjustment_case` table. All the data in the column will be lost.
  - You are about to drop the column `item_unit_id` on the `adjustment_case` table. All the data in the column will be lost.
  - You are about to drop the column `package_code_id` on the `deposit` table. All the data in the column will be lost.
  - You are about to drop the column `item_id` on the `draft_bill` table. All the data in the column will be lost.
  - You are about to drop the column `item_unit_id` on the `draft_bill` table. All the data in the column will be lost.
  - You are about to drop the column `item_id` on the `good_receipt` table. All the data in the column will be lost.
  - You are about to drop the column `item_unit_id` on the `good_receipt` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `package_code` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(10,2)`.
  - You are about to drop the column `item_id` on the `package_content` table. All the data in the column will be lost.
  - You are about to drop the column `item_unit_id` on the `package_content` table. All the data in the column will be lost.
  - You are about to drop the column `brand_id` on the `promotion_code` table. All the data in the column will be lost.
  - You are about to drop the column `bill_code_id` on the `stock_out` table. All the data in the column will be lost.
  - You are about to drop the column `bill_id` on the `stock_out` table. All the data in the column will be lost.
  - You are about to drop the column `item_id` on the `stock_out` table. All the data in the column will be lost.
  - You are about to drop the column `pinned_menus` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `item_type_id` on the `user_sales` table. All the data in the column will be lost.
  - You are about to drop the `bill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bill_code` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bill_payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_brand` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_price` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_price_purchase` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_type` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_unit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `location` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promotion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `stock` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `product_id` to the `adjustment_case` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `draft_bill` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `good_receipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `package_content` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `stock_out` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_type_id` to the `user_sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `adjustment_case` DROP FOREIGN KEY `adjustment_case_ibfk_2`;

-- DropForeignKey
ALTER TABLE `adjustment_case` DROP FOREIGN KEY `adjustment_case_ibfk_3`;

-- DropForeignKey
ALTER TABLE `bill` DROP FOREIGN KEY `bill_ibfk_1`;

-- DropForeignKey
ALTER TABLE `bill` DROP FOREIGN KEY `bill_ibfk_2`;

-- DropForeignKey
ALTER TABLE `bill` DROP FOREIGN KEY `bill_ibfk_3`;

-- DropForeignKey
ALTER TABLE `bill` DROP FOREIGN KEY `bill_ibfk_4`;

-- DropForeignKey
ALTER TABLE `bill_code` DROP FOREIGN KEY `bill_code_ibfk_1`;

-- DropForeignKey
ALTER TABLE `bill_code` DROP FOREIGN KEY `bill_code_ibfk_2`;

-- DropForeignKey
ALTER TABLE `bill_code` DROP FOREIGN KEY `bill_code_ibfk_3`;

-- DropForeignKey
ALTER TABLE `bill_payment` DROP FOREIGN KEY `bill_payment_ibfk_1`;

-- DropForeignKey
ALTER TABLE `bill_payment` DROP FOREIGN KEY `bill_payment_ibfk_2`;

-- DropForeignKey
ALTER TABLE `deposit` DROP FOREIGN KEY `deposit_ibfk_2`;

-- DropForeignKey
ALTER TABLE `deposit` DROP FOREIGN KEY `deposit_ibfk_3`;

-- DropForeignKey
ALTER TABLE `deposit` DROP FOREIGN KEY `deposit_ibfk_4`;

-- DropForeignKey
ALTER TABLE `draft_bill` DROP FOREIGN KEY `draft_bill_item_id_fkey`;

-- DropForeignKey
ALTER TABLE `draft_bill` DROP FOREIGN KEY `draft_bill_item_unit_id_fkey`;

-- DropForeignKey
ALTER TABLE `good_receipt` DROP FOREIGN KEY `good_receipt_ibfk_2`;

-- DropForeignKey
ALTER TABLE `good_receipt` DROP FOREIGN KEY `good_receipt_ibfk_3`;

-- DropForeignKey
ALTER TABLE `item` DROP FOREIGN KEY `item_ibfk_1`;

-- DropForeignKey
ALTER TABLE `item` DROP FOREIGN KEY `item_ibfk_2`;

-- DropForeignKey
ALTER TABLE `item` DROP FOREIGN KEY `item_ibfk_3`;

-- DropForeignKey
ALTER TABLE `item` DROP FOREIGN KEY `item_ibfk_4`;

-- DropForeignKey
ALTER TABLE `item` DROP FOREIGN KEY `item_ibfk_5`;

-- DropForeignKey
ALTER TABLE `item_brand` DROP FOREIGN KEY `item_brand_ibfk_1`;

-- DropForeignKey
ALTER TABLE `item_brand` DROP FOREIGN KEY `item_brand_ibfk_2`;

-- DropForeignKey
ALTER TABLE `item_brand` DROP FOREIGN KEY `item_brand_ibfk_3`;

-- DropForeignKey
ALTER TABLE `item_price` DROP FOREIGN KEY `item_price_ibfk_1`;

-- DropForeignKey
ALTER TABLE `item_price` DROP FOREIGN KEY `item_price_ibfk_2`;

-- DropForeignKey
ALTER TABLE `item_price` DROP FOREIGN KEY `item_price_ibfk_3`;

-- DropForeignKey
ALTER TABLE `item_price` DROP FOREIGN KEY `item_price_ibfk_4`;

-- DropForeignKey
ALTER TABLE `item_price_purchase` DROP FOREIGN KEY `item_price_purchase_ibfk_1`;

-- DropForeignKey
ALTER TABLE `item_price_purchase` DROP FOREIGN KEY `item_price_purchase_ibfk_2`;

-- DropForeignKey
ALTER TABLE `item_price_purchase` DROP FOREIGN KEY `item_price_purchase_ibfk_3`;

-- DropForeignKey
ALTER TABLE `item_price_purchase` DROP FOREIGN KEY `item_price_purchase_item_unit_id_fkey`;

-- DropForeignKey
ALTER TABLE `item_type` DROP FOREIGN KEY `item_type_ibfk_1`;

-- DropForeignKey
ALTER TABLE `item_type` DROP FOREIGN KEY `item_type_ibfk_2`;

-- DropForeignKey
ALTER TABLE `item_type` DROP FOREIGN KEY `item_type_ibfk_3`;

-- DropForeignKey
ALTER TABLE `item_unit` DROP FOREIGN KEY `item_unit_ibfk_1`;

-- DropForeignKey
ALTER TABLE `item_unit` DROP FOREIGN KEY `item_unit_ibfk_2`;

-- DropForeignKey
ALTER TABLE `item_unit` DROP FOREIGN KEY `item_unit_ibfk_3`;

-- DropForeignKey
ALTER TABLE `location` DROP FOREIGN KEY `location_ibfk_1`;

-- DropForeignKey
ALTER TABLE `location` DROP FOREIGN KEY `location_ibfk_2`;

-- DropForeignKey
ALTER TABLE `package_content` DROP FOREIGN KEY `package_ibfk_2`;

-- DropForeignKey
ALTER TABLE `package_content` DROP FOREIGN KEY `package_ibfk_3`;

-- DropForeignKey
ALTER TABLE `promotion` DROP FOREIGN KEY `promotion_promotion_code_id_fkey`;

-- DropForeignKey
ALTER TABLE `promotion_code` DROP FOREIGN KEY `promotion_code_ibfk_3`;

-- DropForeignKey
ALTER TABLE `sales_return` DROP FOREIGN KEY `sales_return_ibfk_1`;

-- DropForeignKey
ALTER TABLE `stock` DROP FOREIGN KEY `stock_id_fkey`;

-- DropForeignKey
ALTER TABLE `stock_in` DROP FOREIGN KEY `stock_in_ibfk_1`;

-- DropForeignKey
ALTER TABLE `stock_out` DROP FOREIGN KEY `stock_out_ibfk_1`;

-- DropForeignKey
ALTER TABLE `stock_out` DROP FOREIGN KEY `stock_out_ibfk_4`;

-- DropForeignKey
ALTER TABLE `stock_out` DROP FOREIGN KEY `stock_out_ibfk_5`;

-- DropForeignKey
ALTER TABLE `user_sales` DROP FOREIGN KEY `user_sales_ibfk_2`;

-- AlterTable
ALTER TABLE `adjustment_case` DROP COLUMN `item_id`,
    DROP COLUMN `item_unit_id`,
    ADD COLUMN `product_id` INTEGER NOT NULL,
    ADD COLUMN `product_unit_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `deposit` DROP COLUMN `package_code_id`;

-- AlterTable
ALTER TABLE `draft_bill` DROP COLUMN `item_id`,
    DROP COLUMN `item_unit_id`,
    ADD COLUMN `product_id` INTEGER NOT NULL,
    ADD COLUMN `product_unit_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `good_receipt` DROP COLUMN `item_id`,
    DROP COLUMN `item_unit_id`,
    ADD COLUMN `net_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `product_id` INTEGER NOT NULL,
    ADD COLUMN `product_unit_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `package_code` MODIFY `price` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `package_content` DROP COLUMN `item_id`,
    DROP COLUMN `item_unit_id`,
    ADD COLUMN `product_id` INTEGER NOT NULL,
    ADD COLUMN `product_unit_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `promotion_code` DROP COLUMN `brand_id`,
    ADD COLUMN `updated_at` DATETIME(0) NULL,
    ADD COLUMN `updated_by` INTEGER NULL;

-- AlterTable
ALTER TABLE `stock_out` DROP COLUMN `bill_code_id`,
    DROP COLUMN `bill_id`,
    DROP COLUMN `item_id`,
    ADD COLUMN `product_id` INTEGER NOT NULL,
    ADD COLUMN `sales_invoice_code_id` INTEGER NULL,
    ADD COLUMN `sales_invoice_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `pinned_menus`;

-- AlterTable
ALTER TABLE `user_sales` DROP COLUMN `item_type_id`,
    ADD COLUMN `product_type_id` INTEGER NOT NULL;

-- DropTable
DROP TABLE `bill`;

-- DropTable
DROP TABLE `bill_code`;

-- DropTable
DROP TABLE `bill_payment`;

-- DropTable
DROP TABLE `item`;

-- DropTable
DROP TABLE `item_brand`;

-- DropTable
DROP TABLE `item_price`;

-- DropTable
DROP TABLE `item_price_purchase`;

-- DropTable
DROP TABLE `item_type`;

-- DropTable
DROP TABLE `item_unit`;

-- DropTable
DROP TABLE `location`;

-- DropTable
DROP TABLE `promotion`;

-- DropTable
DROP TABLE `stock`;

-- CreateTable
CREATE TABLE `sales_invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NULL,
    `product_unit_id` INTEGER NULL,
    `price` DECIMAL(50, 4) NOT NULL,
    `discount` DECIMAL(50, 4) NOT NULL,
    `quantity` DECIMAL(50, 4) NOT NULL,
    `sales_invoice_code_id` INTEGER NOT NULL,

    INDEX `sales_invoice_ibfk_1_idx`(`sales_invoice_code_id`),
    INDEX `sales_invoice_ibfk_3_idx`(`product_unit_id`),
    INDEX `item_id`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_invoice_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `customer_id` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `is_confirm` BOOLEAN NOT NULL DEFAULT false,
    `confirmed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,
    `discount` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `delivery` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `service` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `uuid` VARCHAR(45) NOT NULL,
    `payment_term` INTEGER NULL,
    `is_paid` BOOLEAN NOT NULL DEFAULT false,
    `sales` VARCHAR(191) NULL,
    `date` DATE NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    UNIQUE INDEX `uuid_UNIQUE`(`uuid`),
    INDEX `bill_code_ibfk_1_idx`(`created_by`),
    INDEX `bill_code_ibfk_2_idx`(`confirmed_by`),
    INDEX `bill_code_ibfk_3_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_invoice_payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_method_id` INTEGER NULL,
    `sales_invoice_code_id` INTEGER NOT NULL,
    `value` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    `date` DATE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(50) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `minimum_stock` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(0) NULL,
    `product_type_id` INTEGER NOT NULL,
    `product_brand_id` INTEGER NOT NULL,
    `unit` VARCHAR(45) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sales_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `sales_discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `purchase_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `purchase_discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,

    INDEX `product_fulltext`(`reference`, `description`),
    INDEX `product_ibfk_1_idx`(`created_by`),
    INDEX `product_ibfk_2_idx`(`deleted_by`),
    INDEX `product_ibfk_3_idx`(`product_brand_id`),
    INDEX `product_ibfk_4_idx`(`updated_by`),
    INDEX `product_ibfk_5_idx`(`product_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_brand` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(0) NULL,

    INDEX `item_brand_fulltext`(`name`),
    INDEX `item_brand_ibfk_1_idx`(`created_by`),
    INDEX `item_brand_ibfk_2_idx`(`deleted_by`),
    INDEX `item_brand_ibfk_3_idx`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `unit` VARCHAR(45) NOT NULL,
    `conversion` DECIMAL(12, 2) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(0) NULL,
    `deleted_by` INTEGER NULL,
    `sales_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.0000,
    `sales_discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.0000,
    `purchase_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.0000,
    `purchase_discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.0000,

    INDEX `product_id`(`product_id`),
    INDEX `deleted_by`(`deleted_by`),
    INDEX `item_unit_ibfk_2`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(0) NULL,
    `is_editable` BOOLEAN NULL DEFAULT false,
    `userId` INTEGER NULL,

    INDEX `item_type_ibfk_1_idx`(`created_by`),
    INDEX `item_type_ibfk_2_idx`(`deleted_by`),
    INDEX `item_type_ibfk_3_idx`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_stock` (
    `id` INTEGER NOT NULL,
    `stock` DECIMAL(65, 30) NOT NULL,

    UNIQUE INDEX `product_stock_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotion_brand` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `promotion_code_id` INTEGER NOT NULL,
    `product_brand_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotion_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rule` VARCHAR(45) NOT NULL,
    `value` VARCHAR(45) NOT NULL,
    `promotion_code_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_card` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `display_quantity` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(45) NOT NULL,
    `date` DATE NOT NULL,
    `customer_id` INTEGER NULL,
    `supplier_id` INTEGER NULL,
    `document_name` VARCHAR(100) NULL,
    `sales_invoice_id` INTEGER NULL,
    `sales_invoice_code_id` INTEGER NULL,
    `adjustment_case_id` INTEGER NULL,
    `adjustment_case_code_id` INTEGER NULL,
    `good_receipt_id` INTEGER NULL,
    `good_receipt_code_id` INTEGER NULL,
    `sales_return_id` INTEGER NULL,
    `sales_return_code_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `title` VARCHAR(100) NOT NULL,
    `message` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `adjustment_case_ibfk_3_idx` ON `adjustment_case`(`product_unit_id`);

-- CreateIndex
CREATE INDEX `product_id` ON `adjustment_case`(`product_id`);

-- CreateIndex
CREATE INDEX `good_receipt_ibfk_2_idx` ON `good_receipt`(`product_id`);

-- CreateIndex
CREATE INDEX `good_receipt_ibfk_3_idx` ON `good_receipt`(`product_unit_id`);

-- AddForeignKey
ALTER TABLE `user_sales` ADD CONSTRAINT `user_sales_ibfk_2` FOREIGN KEY (`product_type_id`) REFERENCES `product_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice` ADD CONSTRAINT `bill_ibfk_1` FOREIGN KEY (`sales_invoice_code_id`) REFERENCES `sales_invoice_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice` ADD CONSTRAINT `bill_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice` ADD CONSTRAINT `bill_ibfk_3` FOREIGN KEY (`product_unit_id`) REFERENCES `product_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice_code` ADD CONSTRAINT `bill_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice_code` ADD CONSTRAINT `bill_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice_code` ADD CONSTRAINT `bill_code_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice_payment` ADD CONSTRAINT `bill_payment_ibfk_2` FOREIGN KEY (`sales_invoice_code_id`) REFERENCES `sales_invoice_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_invoice_payment` ADD CONSTRAINT `bill_payment_ibfk_1` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit` ADD CONSTRAINT `deposit_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit` ADD CONSTRAINT `deposit_ibfk_3` FOREIGN KEY (`item_unit_id`) REFERENCES `product_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt` ADD CONSTRAINT `good_receipt_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt` ADD CONSTRAINT `good_receipt_ibfk_3` FOREIGN KEY (`product_unit_id`) REFERENCES `product_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `item_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `item_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `item_ibfk_3` FOREIGN KEY (`product_brand_id`) REFERENCES `product_brand`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `item_ibfk_5` FOREIGN KEY (`product_type_id`) REFERENCES `product_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product` ADD CONSTRAINT `item_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_brand` ADD CONSTRAINT `item_brand_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_brand` ADD CONSTRAINT `item_brand_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_brand` ADD CONSTRAINT `item_brand_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case` ADD CONSTRAINT `adjustment_case_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case` ADD CONSTRAINT `adjustment_case_ibfk_3` FOREIGN KEY (`product_unit_id`) REFERENCES `product_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_unit` ADD CONSTRAINT `item_unit_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_unit` ADD CONSTRAINT `item_unit_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_unit` ADD CONSTRAINT `item_unit_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_type` ADD CONSTRAINT `item_type_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_type` ADD CONSTRAINT `item_type_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_return` ADD CONSTRAINT `sales_return_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `sales_invoice`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_content` ADD CONSTRAINT `package_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_content` ADD CONSTRAINT `package_ibfk_3` FOREIGN KEY (`product_unit_id`) REFERENCES `product_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `product_stock` ADD CONSTRAINT `product_stock_id_fkey` FOREIGN KEY (`id`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_bill` ADD CONSTRAINT `draft_bill_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_bill` ADD CONSTRAINT `draft_bill_product_unit_id_fkey` FOREIGN KEY (`product_unit_id`) REFERENCES `product_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_code` ADD CONSTRAINT `promotion_code_ibfk_5` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `promotion_brand` ADD CONSTRAINT `promotion_brand_promotion_code_id_fkey` FOREIGN KEY (`promotion_code_id`) REFERENCES `promotion_code`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_brand` ADD CONSTRAINT `promotion_brand_product_brand_id_fkey` FOREIGN KEY (`product_brand_id`) REFERENCES `product_brand`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_rules` ADD CONSTRAINT `promotion_rules_promotion_code_id_fkey` FOREIGN KEY (`promotion_code_id`) REFERENCES `promotion_code`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_in` ADD CONSTRAINT `stock_in_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_1` FOREIGN KEY (`sales_invoice_id`) REFERENCES `sales_invoice`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_4` FOREIGN KEY (`sales_invoice_code_id`) REFERENCES `sales_invoice_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_5` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_3` FOREIGN KEY (`sales_invoice_id`) REFERENCES `sales_invoice`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_4` FOREIGN KEY (`sales_invoice_code_id`) REFERENCES `sales_invoice_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_5` FOREIGN KEY (`adjustment_case_id`) REFERENCES `adjustment_case`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_6` FOREIGN KEY (`adjustment_case_code_id`) REFERENCES `adjustment_case_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_7` FOREIGN KEY (`good_receipt_id`) REFERENCES `good_receipt`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_8` FOREIGN KEY (`good_receipt_code_id`) REFERENCES `good_receipt_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_10` FOREIGN KEY (`sales_return_id`) REFERENCES `sales_return`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_11` FOREIGN KEY (`sales_return_code_id`) REFERENCES `sales_return_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_card` ADD CONSTRAINT `stock_card_ibfk_9` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
