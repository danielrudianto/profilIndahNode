-- Pengembalian diskon berupa uang kepada pelanggan.
--
-- Nilainya TIDAK mengurangi total faktur. Fakturnya tetap menunjukkan harga
-- penuh; yang dicatat di sini adalah arus kas keluar yang terikat padanya.

CREATE TABLE `sales_invoice_rebate` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `sales_invoice_code_id` INTEGER NOT NULL,
  `value` DECIMAL(15, 4) NOT NULL,
  `payment_method_id` INTEGER NULL,
  `date` DATE NOT NULL,
  `receiver_name` VARCHAR(100) NOT NULL,
  `bank_name` VARCHAR(100) NULL,
  `account_number` VARCHAR(50) NULL,
  `created_by` INTEGER NOT NULL,
  `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX `sales_invoice_rebate_ibfk_1_idx`(`sales_invoice_code_id`),
  INDEX `sales_invoice_rebate_ibfk_2_idx`(`payment_method_id`),
  INDEX `sales_invoice_rebate_ibfk_3_idx`(`created_by`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

ALTER TABLE `sales_invoice_rebate`
  ADD CONSTRAINT `sales_invoice_rebate_ibfk_1`
  FOREIGN KEY (`sales_invoice_code_id`) REFERENCES `sales_invoice_code`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `sales_invoice_rebate`
  ADD CONSTRAINT `sales_invoice_rebate_ibfk_2`
  FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `sales_invoice_rebate`
  ADD CONSTRAINT `sales_invoice_rebate_ibfk_3`
  FOREIGN KEY (`created_by`) REFERENCES `user`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;
