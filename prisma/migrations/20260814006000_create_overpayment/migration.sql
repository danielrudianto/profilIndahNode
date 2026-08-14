-- Tabel overpayment: uang pelanggan yang dikembalikan.
--
-- Modelnya sudah lama ada di schema.prisma dan sudah dipakai kode —
-- sales-deposit.reject memanggil overpaymentRepository.createMany ketika
-- method-nya "create" — tetapi tabelnya tidak pernah dibuat lewat migrasi.
-- Pada basis data yang belum memilikinya, penolakan setoran disertai
-- pengembalian dana gagal dengan MySQL 1146.
--
-- IF NOT EXISTS dipakai dengan alasan yang sama seperti migrasi penggantian
-- nama sebelumnya: lingkungan yang tabelnya sudah ada tidak boleh gagal.
--
-- Tipe kolomnya mengikuti bawaan Prisma untuk MySQL: String tanpa @db menjadi
-- VARCHAR(191), DateTime tanpa @db menjadi DATETIME(3), dan Boolean menjadi
-- TINYINT(1). Yang punya @db mengikuti anotasinya.

CREATE TABLE IF NOT EXISTS `overpayment` (
  `id`                    INT           NOT NULL AUTO_INCREMENT,
  `customer_id`           INT           NULL,
  `date`                  DATETIME(3)   NOT NULL,
  `payment_method_id`     INT           NULL,
  `sales_deposit_code_id` INT           NULL,
  `return_payment_method` VARCHAR(191)  NOT NULL,
  `return_payment_number` VARCHAR(191)  NULL,
  `return_payment_date`   DATETIME(3)   NOT NULL,
  `return_payment_bank`   VARCHAR(191)  NULL,
  `return_payment_name`   VARCHAR(191)  NOT NULL,
  `created_by`            INT           NOT NULL,
  `created_at`            DATETIME(0)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_resolved`           TINYINT(1)    NOT NULL DEFAULT 0,
  `value`                 DECIMAL(12,2) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `overpayment_payment_method_id_fkey` (`payment_method_id`),
  INDEX `overpayment_code_ibfk1_idx` (`customer_id`),
  INDEX `overpayment_code_ibfk3_idx` (`sales_deposit_code_id`),
  INDEX `overpayment_code_ibfk4_idx` (`created_by`),

  CONSTRAINT `overpayment_payment_method_id_fkey`
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `overpayment_code_ibfk1`
    FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `overpayment_code_ibfk3`
    FOREIGN KEY (`sales_deposit_code_id`) REFERENCES `sales_deposit_code` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `overpayment_code_ibfk4`
    FOREIGN KEY (`created_by`) REFERENCES `user` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
