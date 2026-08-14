-- Menyamakan nama tabel setoran dengan schema.prisma.
--
-- Skema menyebut ketiganya sales_deposit, sales_deposit_code, dan
-- sales_deposit_payment, tetapi tidak ada satu pun migrasi yang pernah
-- melakukan penggantian namanya — modelnya disunting tangan. Akibatnya basis
-- data yang belum ikut berganti nama menolak SETIAP kueri setoran dengan
-- MySQL 1146, karena Prisma mencari nama yang tidak ada di sana.
--
-- KENAPA BERSYARAT. Basis data produksi SUDAH memakai nama baru, sedangkan
-- salinan pengembangan masih memakai nama lama. RENAME TABLE polos akan
-- berhasil di satu tempat dan gagal di tempat lain, sehingga migrasi ini
-- memeriksa dulu keberadaan tabel lamanya dan tidak melakukan apa pun bila
-- penggantian namanya sudah pernah terjadi. Satu berkas yang sama karenanya
-- aman dijalankan di kedua lingkungan, tanpa langkah manual yang bisa
-- terlupa.
--
-- Penggantian nama tidak memindahkan satu baris pun data: MySQL hanya
-- memperbarui katalognya, dan seluruh kunci asing yang menunjuk tabel ini ikut
-- diperbarui otomatis.

SET @ada := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deposit'
);
SET @sql := IF(@ada = 1, 'RENAME TABLE `deposit` TO `sales_deposit`', 'DO 0');
PREPARE pernyataan FROM @sql;
EXECUTE pernyataan;
DEALLOCATE PREPARE pernyataan;

SET @ada := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deposit_code'
);
SET @sql := IF(@ada = 1, 'RENAME TABLE `deposit_code` TO `sales_deposit_code`', 'DO 0');
PREPARE pernyataan FROM @sql;
EXECUTE pernyataan;
DEALLOCATE PREPARE pernyataan;

SET @ada := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'deposit_payment'
);
SET @sql := IF(@ada = 1, 'RENAME TABLE `deposit_payment` TO `sales_deposit_payment`', 'DO 0');
PREPARE pernyataan FROM @sql;
EXECUTE pernyataan;
DEALLOCATE PREPARE pernyataan;
