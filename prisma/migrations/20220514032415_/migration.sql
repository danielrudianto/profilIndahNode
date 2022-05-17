-- CreateTable
CREATE TABLE `bill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `price` DECIMAL(50, 4) NOT NULL,
    `discount` DECIMAL(50, 4) NOT NULL,
    `quantity` DECIMAL(50, 4) NOT NULL,
    `bill_code_id` INTEGER NOT NULL,

    INDEX `bill_ibfk_1_idx`(`bill_code_id`),
    INDEX `bill_ibfk_2_idx`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `customer_id` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `payment_method_id` INTEGER NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `is_confirm` BOOLEAN NOT NULL DEFAULT false,
    `confirmed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,
    `discount` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `delivery` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    INDEX `bill_code_ibfk_1_idx`(`created_by`),
    INDEX `bill_code_ibfk_2_idx`(`confirmed_by`),
    INDEX `bill_code_ibfk_3_idx`(`customer_id`),
    INDEX `bill_code_ibfk_4_idx`(`payment_method_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company` (
    `id` INTEGER NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `address` TEXT NOT NULL,
    `npwp` VARCHAR(45) NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `company_ibfk_1_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `npwp` VARCHAR(45) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `customer_ibfk_1_idx`(`created_by`),
    INDEX `customer_ibfk_2_idx`(`deleted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `description` TEXT NOT NULL,
    `value` DECIMAL(50, 4) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `expense_type_id` INTEGER NOT NULL,

    INDEX `expense_ibfk_1_idx`(`created_by`),
    INDEX `expense_ibfk_2_idx`(`deleted_by`),
    INDEX `expense_ibfk_3_idx`(`expense_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `parent_id` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `expense_type_ibfk_1_idx`(`created_by`),
    INDEX `expense_type_ibfk_2_idx`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `good_receipt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `purchase_order_id` INTEGER NOT NULL,
    `quantity` DECIMAL(50, 4) NOT NULL,
    `good_receipt_code_id` INTEGER NOT NULL,

    INDEX `good_receipt_ibfk_1_idx`(`purchase_order_id`),
    INDEX `good_receipt_ibfk_2_idx`(`good_receipt_code_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `good_receipt_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `date` VARCHAR(45) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_confirm` BOOLEAN NOT NULL DEFAULT false,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `confimed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,

    INDEX `good_receipt_code_ibfk_1_idx`(`created_by`),
    INDEX `good_receipt_code_ibfk_2_idx`(`confimed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reference` VARCHAR(45) NOT NULL,
    `description` TEXT NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `reference_UNIQUE`(`reference`),
    INDEX `item_ibfk_1_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_method` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `payment_method_ibfk_1_idx`(`created_by`),
    INDEX `payment_method_ibfk_2_idx`(`deleted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `price` DECIMAL(50, 4) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `purchase_order_code_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `confirmed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,
    `is_confirm` BOOLEAN NOT NULL DEFAULT false,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `company_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    INDEX `purchase_order_code_ibfk_1_idx`(`created_by`),
    INDEX `purchase_order_code_ibfk_2_idx`(`confirmed_by`),
    INDEX `purchase_order_code_ibfk_3_idx`(`company_id`),
    INDEX `purchase_order_code_ibfk_4_idx`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `npwp` VARCHAR(45) NULL,
    `address` TEXT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `supplier_ibfk_1_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `nik` VARCHAR(45) NOT NULL,
    `username` VARCHAR(45) NOT NULL,
    `password` VARCHAR(45) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `nik_UNIQUE`(`nik`),
    UNIQUE INDEX `username_UNIQUE`(`username`),
    INDEX `user_ibfk_1_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bill` ADD CONSTRAINT `bill_ibfk_1` FOREIGN KEY (`bill_code_id`) REFERENCES `bill_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill` ADD CONSTRAINT `bill_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_code` ADD CONSTRAINT `bill_code_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_code` ADD CONSTRAINT `bill_code_ibfk_4` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_code` ADD CONSTRAINT `bill_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_code` ADD CONSTRAINT `bill_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_ibfk_3` FOREIGN KEY (`expense_type_id`) REFERENCES `expense_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense_type` ADD CONSTRAINT `expense_type_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `expense_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense_type` ADD CONSTRAINT `expense_type_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt` ADD CONSTRAINT `good_receipt_ibfk_2` FOREIGN KEY (`good_receipt_code_id`) REFERENCES `good_receipt_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt` ADD CONSTRAINT `good_receipt_ibfk_1` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_order`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt_code` ADD CONSTRAINT `good_receipt_code_ibfk_2` FOREIGN KEY (`confimed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt_code` ADD CONSTRAINT `good_receipt_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item` ADD CONSTRAINT `item_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_method` ADD CONSTRAINT `payment_method_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_method` ADD CONSTRAINT `payment_method_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_code` ADD CONSTRAINT `purchase_order_code_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_code` ADD CONSTRAINT `purchase_order_code_ibfk_4` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_code` ADD CONSTRAINT `purchase_order_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_order_code` ADD CONSTRAINT `purchase_order_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `supplier_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
