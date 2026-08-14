-- Menambahkan jejak perubahan pada expense_type.
--
-- Sembilan tabel lain — customer, supplier, company, payment_method, product,
-- product_brand, product_type, promotion_code, user — sudah memiliki pasangan
-- kolom ini. expense_type tertinggal, sehingga perubahan pada jenis pengeluaran
-- tidak meninggalkan jejak siapa pun.
--
-- Keduanya NULLABLE dan tanpa nilai bawaan: baris yang sudah ada memang belum
-- pernah disunting, dan mengisinya dengan waktu migrasi akan berbohong seolah
-- semuanya baru saja diubah.

ALTER TABLE `expense_type`
  ADD COLUMN `updated_by` INT NULL,
  ADD COLUMN `updated_at` DATETIME(0) NULL;

-- Indeks mengikuti pola ketiga kunci asing yang sudah ada pada tabel ini.
CREATE INDEX `expense_type_ibfk_4_idx` ON `expense_type`(`updated_by`);

ALTER TABLE `expense_type`
  ADD CONSTRAINT `expense_type_ibfk_4`
  FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;
