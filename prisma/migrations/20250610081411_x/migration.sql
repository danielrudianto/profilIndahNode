-- CreateTable
CREATE TABLE `payment_method` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NULL,
    `updated_by` INTEGER NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `payment_method_ibfk_1_idx`(`created_by`),
    INDEX `payment_method_ibfk_2_idx`(`deleted_by`),
    INDEX `payment_method_ibfk_3_idx`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `nik` VARCHAR(45) NOT NULL,
    `username` VARCHAR(45) NOT NULL,
    `password` VARCHAR(100) NOT NULL,
    `created_by` INTEGER NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(0) NULL,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `role` INTEGER NOT NULL,
    `pinned_menus` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `nik_UNIQUE`(`nik`),
    UNIQUE INDEX `username_UNIQUE`(`username`),
    INDEX `user_ibfk_1_idx`(`created_by`),
    INDEX `user_ibfk_2_idx`(`deleted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_avatar` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `top` INTEGER NULL,
    `accessories` INTEGER NULL,
    `clothes` INTEGER NULL,
    `eyes` INTEGER NULL,
    `eyebrows` INTEGER NULL,
    `mouth` INTEGER NULL,
    `color` VARCHAR(45) NOT NULL,
    `circle` BOOLEAN NOT NULL,

    UNIQUE INDEX `user_avatar_user_id_key`(`user_id`),
    INDEX `user_avatar_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `item_type_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NULL,
    `item_unit_id` INTEGER NULL,
    `package_code_id` INTEGER NULL,
    `price` DECIMAL(50, 4) NOT NULL,
    `discount` DECIMAL(50, 4) NOT NULL,
    `quantity` DECIMAL(50, 4) NOT NULL,
    `bill_code_id` INTEGER NOT NULL,

    INDEX `bill_ibfk_1_idx`(`bill_code_id`),
    INDEX `bill_ibfk_3_idx`(`item_unit_id`),
    INDEX `item_id`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bill_code` (
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
CREATE TABLE `bill_payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_method_id` INTEGER NULL,
    `bill_code_id` INTEGER NOT NULL,
    `value` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    `date` DATE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NULL,
    `item_unit_id` INTEGER NULL,
    `package_code_id` INTEGER NULL,
    `price` DECIMAL(50, 4) NOT NULL,
    `discount` DECIMAL(50, 4) NOT NULL,
    `quantity` DECIMAL(50, 4) NOT NULL,
    `deposit_code_id` INTEGER NOT NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,

    INDEX `deposit_ibfk_1_idx`(`deposit_code_id`),
    INDEX `deposit_ibfk_3_idx`(`item_unit_id`),
    INDEX `deposit_ibfk_4_idx`(`package_code_id`),
    INDEX `item_id`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposit_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `customer_id` INTEGER NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `discount` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `delivery` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `service` DECIMAL(50, 4) NOT NULL DEFAULT 0.0000,
    `uuid` VARCHAR(45) NOT NULL,
    `type` VARCHAR(8) NOT NULL DEFAULT 'EXTERNAL',
    `sales` VARCHAR(191) NULL,
    `date` DATE NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    UNIQUE INDEX `uuid_UNIQUE`(`uuid`),
    INDEX `deposit_code_ibfk_1_idx`(`created_by`),
    INDEX `deposit_code_ibfk_2_idx`(`deleted_by`),
    INDEX `deposit_code_ibfk_3_idx`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposit_payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `payment_method_id` INTEGER NULL,
    `deposit_code_id` INTEGER NOT NULL,
    `value` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    `date` DATE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `address` TEXT NOT NULL,
    `npwp` VARCHAR(45) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(0) NULL,

    INDEX `company_ibfk_1_idx`(`created_by`),
    INDEX `company_ibfk_2_idx`(`deleted_by`),
    INDEX `company_ibfk_3_idx`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(45) NOT NULL,
    `pic` VARCHAR(100) NOT NULL,
    `npwp` VARCHAR(45) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(0) NULL,

    INDEX `customer_fulltext`(`name`, `address`, `pic`, `phone_number`, `npwp`),
    INDEX `customer_ibfk_1_idx`(`created_by`),
    INDEX `customer_ibfk_2_idx`(`deleted_by`),
    INDEX `customer_ibfk_3_idx`(`updated_by`),
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
    `company_id` INTEGER NOT NULL,

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
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,

    INDEX `expense_type_ibfk_1_idx`(`created_by`),
    INDEX `expense_type_ibfk_2_idx`(`parent_id`),
    INDEX `expense_type_ibfk_3_idx`(`deleted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `good_receipt` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `good_receipt_code_id` INTEGER NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL,
    `item_unit_id` INTEGER NULL,

    INDEX `good_receipt_ibfk_1_idx`(`good_receipt_code_id`),
    INDEX `good_receipt_ibfk_2_idx`(`item_id`),
    INDEX `good_receipt_ibfk_3_idx`(`item_unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `good_receipt_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `date` DATE NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_confirm` BOOLEAN NOT NULL DEFAULT false,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `confirmed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,
    `supplier_id` INTEGER NOT NULL,
    `company_id` INTEGER NOT NULL,
    `uuid` VARCHAR(45) NOT NULL,

    UNIQUE INDEX `uuid_UNIQUE`(`uuid`),
    INDEX `good_receipt_code_ibfk_1_idx`(`created_by`),
    INDEX `good_receipt_code_ibfk_2_idx`(`confirmed_by`),
    INDEX `good_receipt_code_ibfk_3_idx`(`supplier_id`),
    INDEX `good_receipt_code_ibfk_4_idx`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item` (
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
    `item_type_id` INTEGER NOT NULL,
    `item_brand_id` INTEGER NOT NULL,
    `unit` VARCHAR(45) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `item_fulltext`(`reference`, `description`),
    INDEX `item_ibfk_1_idx`(`created_by`),
    INDEX `item_ibfk_2_idx`(`deleted_by`),
    INDEX `item_ibfk_3_idx`(`item_brand_id`),
    INDEX `item_ibfk_4_idx`(`updated_by`),
    INDEX `item_ibfk_5_idx`(`item_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_brand` (
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
CREATE TABLE `item_price` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `price` DECIMAL(50, 4) NOT NULL,
    `discount` DECIMAL(50, 4) NOT NULL,
    `effective_date` DATE NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `item_unit_id` INTEGER NULL,

    INDEX `item_price_ibfk_1_idx`(`item_id`),
    INDEX `item_price_ibfk_2_idx`(`created_by`),
    INDEX `item_price_ibfk_4_idx`(`deleted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_price_purchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `item_unit_id` INTEGER NULL,

    INDEX `item_price_purchase_ibfk_1`(`item_id`),
    INDEX `item_price_purchase_ibfk_2`(`created_by`),
    INDEX `item_price_purchase_ibfk_3_idx`(`deleted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NULL,
    `faktur` VARCHAR(45) NULL,
    `date` DATE NULL,
    `discount` DECIMAL(50, 4) NULL DEFAULT 0.0000,
    `good_receipt_code_id` INTEGER NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `is_confirm` BOOLEAN NOT NULL DEFAULT false,
    `confirmed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,
    `is_paid` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `purchase_invoice_good_receipt_code_id_key`(`good_receipt_code_id`),
    INDEX `purchase_invoice_ibfk_1_idx`(`created_by`),
    INDEX `purchase_invoice_ibfk_2_idx`(`good_receipt_code_id`),
    INDEX `purchase_invoice_ibfk_3_idx`(`confirmed_by`),
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
    `is_delete` BOOLEAN NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `updated_by` INTEGER NULL,
    `updated_at` DATETIME(0) NULL,

    INDEX `supplier_ibfk_1_idx`(`created_by`),
    INDEX `supplier_ibfk_2_idx`(`deleted_by`),
    INDEX `supplier_ibfk_3_idx`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `adjustment_case` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `quantity` DECIMAL(50, 2) NOT NULL,
    `adjustment_case_code_id` INTEGER NOT NULL,
    `item_unit_id` INTEGER NULL,

    INDEX `adjustment_case_ibfk_1_idx`(`adjustment_case_code_id`),
    INDEX `adjustment_case_ibfk_3_idx`(`item_unit_id`),
    INDEX `item_id`(`item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `adjustment_case_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(45) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL,
    `is_confirm` BOOLEAN NOT NULL DEFAULT false,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `confirmed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,
    `company_id` INTEGER NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    INDEX `adjustment_event_code_ibfk_1_idx`(`created_by`),
    INDEX `adjustment_case_code_ibfk_3_idx`(`company_id`),
    INDEX `adjustment_event_code_ibfk_2_idx`(`confirmed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_unit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `unit` VARCHAR(45) NOT NULL,
    `conversion` DECIMAL(12, 2) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_at` DATETIME(0) NULL,
    `deleted_by` INTEGER NULL,

    INDEX `item_id`(`item_id`),
    INDEX `deleted_by`(`deleted_by`),
    INDEX `item_unit_ibfk_2`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_type` (
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

    INDEX `item_type_ibfk_1_idx`(`created_by`),
    INDEX `item_type_ibfk_2_idx`(`deleted_by`),
    INDEX `item_type_ibfk_3_idx`(`updated_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_return` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bill_id` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `sales_return_code_id` INTEGER NOT NULL,

    INDEX `sales_return_ibfk_12_idx`(`sales_return_code_id`),
    INDEX `sales_return_ibfk_1_idx`(`bill_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales_return_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `date` DATE NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_confirm` BOOLEAN NULL DEFAULT true,
    `is_delete` BOOLEAN NULL DEFAULT false,
    `confirmed_by` INTEGER NULL,
    `confirmed_at` DATETIME(0) NULL,
    `payment_method_id` INTEGER NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    INDEX `sales_return_code_ibfk_1_idx`(`created_by`),
    INDEX `sales_return_code_ibfk_2_idx`(`confirmed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_content` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `item_unit_id` INTEGER NULL,
    `quantity` INTEGER NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL,
    `package_code_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock` (
    `id` INTEGER NOT NULL,
    `stock` DECIMAL(65, 30) NOT NULL,

    UNIQUE INDEX `stock_id_key`(`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draft_bill_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `customer_id` INTEGER NULL,
    `note` TEXT NULL,
    `delivery` DECIMAL(12, 2) NOT NULL,
    `service` DECIMAL(12, 2) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NULL DEFAULT false,
    `confirmed_by` INTEGER NULL,
    `otc` VARCHAR(6) NOT NULL,
    `confirmed_at` DATETIME(0) NULL,

    UNIQUE INDEX `name_UNIQUE`(`name`),
    INDEX `draft_bill_code_ibfk_1_idx`(`created_by`),
    INDEX `draft_bill_code_ibfk_2_idx`(`confirmed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `draft_bill` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `draft_bill_code_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `item_unit_id` INTEGER NULL,
    `quantity` DECIMAL(16, 4) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `discount` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotion_code` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `description` TEXT NOT NULL,
    `start` DATE NOT NULL,
    `end` DATETIME(0) NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,
    `target` DECIMAL(12, 2) NOT NULL,
    `brand_id` INTEGER NOT NULL,
    `supplier_id` INTEGER NOT NULL,

    INDEX `promotion_code_ibfk_1`(`created_by`),
    INDEX `promotion_code_ibfk_2`(`deleted_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rule` VARCHAR(45) NOT NULL,
    `value` VARCHAR(45) NOT NULL,
    `promotion_code_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `location` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `deleted_by` INTEGER NULL,
    `deleted_at` DATETIME(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_in` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `date` DATE NOT NULL,
    `residue` DECIMAL(12, 2) NOT NULL,
    `company_id` INTEGER NOT NULL,
    `adjustment_case_id` INTEGER NULL,
    `adjustment_case_code_id` INTEGER NULL,
    `good_receipt_id` INTEGER NULL,
    `good_receipt_code_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_out` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `item_id` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `date` DATE NOT NULL,
    `bill_id` INTEGER NULL,
    `bill_code_id` INTEGER NULL,
    `adjustment_case_id` INTEGER NULL,
    `adjustment_case_code_id` INTEGER NULL,
    `stock_in_id` INTEGER NULL,
    `price` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_method` ADD CONSTRAINT `payment_method_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_method` ADD CONSTRAINT `payment_method_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_method` ADD CONSTRAINT `payment_method_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_avatar` ADD CONSTRAINT `user_avatar_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sales` ADD CONSTRAINT `user_sales_ibfk_2` FOREIGN KEY (`item_type_id`) REFERENCES `item_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_sales` ADD CONSTRAINT `user_sales_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill` ADD CONSTRAINT `bill_ibfk_1` FOREIGN KEY (`bill_code_id`) REFERENCES `bill_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill` ADD CONSTRAINT `bill_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill` ADD CONSTRAINT `bill_ibfk_3` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill` ADD CONSTRAINT `bill_ibfk_4` FOREIGN KEY (`package_code_id`) REFERENCES `package_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_code` ADD CONSTRAINT `bill_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_code` ADD CONSTRAINT `bill_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_code` ADD CONSTRAINT `bill_code_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_payment` ADD CONSTRAINT `bill_payment_ibfk_2` FOREIGN KEY (`bill_code_id`) REFERENCES `bill_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bill_payment` ADD CONSTRAINT `bill_payment_ibfk_1` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit` ADD CONSTRAINT `deposit_ibfk_1` FOREIGN KEY (`deposit_code_id`) REFERENCES `deposit_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit` ADD CONSTRAINT `deposit_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit` ADD CONSTRAINT `deposit_ibfk_3` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit` ADD CONSTRAINT `deposit_ibfk_4` FOREIGN KEY (`package_code_id`) REFERENCES `package_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit_code` ADD CONSTRAINT `deposit_code_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit_code` ADD CONSTRAINT `deposit_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit_code` ADD CONSTRAINT `deposit_code_ibfk_3` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit_code` ADD CONSTRAINT `deposit_code_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_payment` ADD CONSTRAINT `deposit_payment_ibfk_1` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deposit_payment` ADD CONSTRAINT `deposit_payment_ibfk_2` FOREIGN KEY (`deposit_code_id`) REFERENCES `deposit_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `company` ADD CONSTRAINT `company_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customer` ADD CONSTRAINT `customer_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_ibfk_3` FOREIGN KEY (`expense_type_id`) REFERENCES `expense_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `expense_ibfk_4` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `expense_type` ADD CONSTRAINT `expense_type_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense_type` ADD CONSTRAINT `expense_type_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `expense_type` ADD CONSTRAINT `expense_type_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `expense_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt` ADD CONSTRAINT `good_receipt_ibfk_1` FOREIGN KEY (`good_receipt_code_id`) REFERENCES `good_receipt_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt` ADD CONSTRAINT `good_receipt_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt` ADD CONSTRAINT `good_receipt_ibfk_3` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt_code` ADD CONSTRAINT `good_receipt_code_ibfk_4` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt_code` ADD CONSTRAINT `good_receipt_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt_code` ADD CONSTRAINT `good_receipt_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `good_receipt_code` ADD CONSTRAINT `good_receipt_code_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item` ADD CONSTRAINT `item_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item` ADD CONSTRAINT `item_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item` ADD CONSTRAINT `item_ibfk_3` FOREIGN KEY (`item_brand_id`) REFERENCES `item_brand`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item` ADD CONSTRAINT `item_ibfk_5` FOREIGN KEY (`item_type_id`) REFERENCES `item_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item` ADD CONSTRAINT `item_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_brand` ADD CONSTRAINT `item_brand_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_brand` ADD CONSTRAINT `item_brand_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_brand` ADD CONSTRAINT `item_brand_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price` ADD CONSTRAINT `item_price_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price` ADD CONSTRAINT `item_price_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price` ADD CONSTRAINT `item_price_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price` ADD CONSTRAINT `item_price_ibfk_4` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price_purchase` ADD CONSTRAINT `item_price_purchase_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price_purchase` ADD CONSTRAINT `item_price_purchase_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price_purchase` ADD CONSTRAINT `item_price_purchase_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_price_purchase` ADD CONSTRAINT `item_price_purchase_item_unit_id_fkey` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_invoice` ADD CONSTRAINT `purchase_invoice_ibfk_3` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_invoice` ADD CONSTRAINT `purchase_invoice_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `purchase_invoice` ADD CONSTRAINT `purchase_invoice_good_receipt_code_id_fkey` FOREIGN KEY (`good_receipt_code_id`) REFERENCES `good_receipt_code`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `supplier_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `supplier_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `supplier` ADD CONSTRAINT `supplier_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case` ADD CONSTRAINT `adjustment_case_ibfk_1` FOREIGN KEY (`adjustment_case_code_id`) REFERENCES `adjustment_case_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case` ADD CONSTRAINT `adjustment_case_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case` ADD CONSTRAINT `adjustment_case_ibfk_3` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case_code` ADD CONSTRAINT `adjustment_case_code_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case_code` ADD CONSTRAINT `adjustment_case_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `adjustment_case_code` ADD CONSTRAINT `adjustment_case_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_unit` ADD CONSTRAINT `item_unit_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_unit` ADD CONSTRAINT `item_unit_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_unit` ADD CONSTRAINT `item_unit_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_type` ADD CONSTRAINT `item_type_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_type` ADD CONSTRAINT `item_type_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `item_type` ADD CONSTRAINT `item_type_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_return` ADD CONSTRAINT `sales_return_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bill`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_return` ADD CONSTRAINT `sales_return_ibfk_2` FOREIGN KEY (`sales_return_code_id`) REFERENCES `sales_return_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_return_code` ADD CONSTRAINT `sales_return_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_return_code` ADD CONSTRAINT `sales_return_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sales_return_code` ADD CONSTRAINT `sales_return_code_payment_method_id_fkey` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `package_code` ADD CONSTRAINT `package_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_code` ADD CONSTRAINT `package_code_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_content` ADD CONSTRAINT `package_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_content` ADD CONSTRAINT `package_ibfk_3` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `package_content` ADD CONSTRAINT `package_ibfk_1` FOREIGN KEY (`package_code_id`) REFERENCES `package_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock` ADD CONSTRAINT `stock_id_fkey` FOREIGN KEY (`id`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_bill_code` ADD CONSTRAINT `draft_bill_code_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_bill_code` ADD CONSTRAINT `draft_bill_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `draft_bill_code` ADD CONSTRAINT `draft_bill_code_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `draft_bill` ADD CONSTRAINT `draft_bill_draft_bill_code_id_fkey` FOREIGN KEY (`draft_bill_code_id`) REFERENCES `draft_bill_code`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_bill` ADD CONSTRAINT `draft_bill_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `draft_bill` ADD CONSTRAINT `draft_bill_item_unit_id_fkey` FOREIGN KEY (`item_unit_id`) REFERENCES `item_unit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promotion_code` ADD CONSTRAINT `promotion_code_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `promotion_code` ADD CONSTRAINT `promotion_code_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `promotion_code` ADD CONSTRAINT `promotion_code_ibfk_3` FOREIGN KEY (`brand_id`) REFERENCES `item_brand`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `promotion_code` ADD CONSTRAINT `promotion_code_ibfk_4` FOREIGN KEY (`supplier_id`) REFERENCES `supplier`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `promotion` ADD CONSTRAINT `promotion_promotion_code_id_fkey` FOREIGN KEY (`promotion_code_id`) REFERENCES `promotion_code`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `location` ADD CONSTRAINT `location_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `location` ADD CONSTRAINT `location_ibfk_2` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_in` ADD CONSTRAINT `stock_in_ibfk_3` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_in` ADD CONSTRAINT `stock_in_ibfk_2` FOREIGN KEY (`adjustment_case_id`) REFERENCES `adjustment_case`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_in` ADD CONSTRAINT `stock_in_ibfk_4` FOREIGN KEY (`adjustment_case_code_id`) REFERENCES `adjustment_case_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_in` ADD CONSTRAINT `stock_in_ibfk_5` FOREIGN KEY (`good_receipt_id`) REFERENCES `good_receipt`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_in` ADD CONSTRAINT `stock_in_ibfk_6` FOREIGN KEY (`good_receipt_code_id`) REFERENCES `good_receipt_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_in` ADD CONSTRAINT `stock_in_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_1` FOREIGN KEY (`bill_id`) REFERENCES `bill`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_4` FOREIGN KEY (`bill_code_id`) REFERENCES `bill_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_2` FOREIGN KEY (`adjustment_case_id`) REFERENCES `adjustment_case`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_3` FOREIGN KEY (`adjustment_case_code_id`) REFERENCES `adjustment_case_code`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_5` FOREIGN KEY (`item_id`) REFERENCES `item`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `stock_out` ADD CONSTRAINT `stock_out_ibfk_6` FOREIGN KEY (`stock_in_id`) REFERENCES `stock_in`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
