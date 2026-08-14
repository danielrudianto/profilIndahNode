-- Jejak audit seluruh sistem.
--
-- Melengkapi kolom created_by/updated_by/deleted_by yang sudah ada di hampir
-- setiap tabel. Kolom-kolom itu hanya menyimpan SIAPA YANG TERAKHIR menyentuh
-- baris, sehingga tidak bisa menjawab "apa saja yang terjadi hari ini" atau
-- "apa saja yang diubah orang tertentu" — riwayatnya tertimpa setiap kali.
--
-- entity berisi nama tabel apa adanya, bukan bentuk jamak buatan sendiri,
-- karena pencatatnya bekerja di lapisan Prisma dan yang ia ketahui memang nama
-- model. Penyaring di frontend memakai nilai yang sama.
--
-- entity_id boleh NULL: operasi massal seperti createMany tidak mengembalikan
-- id per baris, dan mencatat operasinya tanpa id tetap lebih berguna daripada
-- tidak mencatat sama sekali.
--
-- user_id juga boleh NULL: perintah CLI di startup.ts dan pekerjaan worker
-- menulis tanpa permintaan HTTP, sehingga tidak ada pengguna yang bisa
-- disebutkan.

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `entity`     VARCHAR(64)  NOT NULL,
  `entity_id`  INT          NULL,
  `action`     VARCHAR(16)  NOT NULL,
  `user_id`    INT          NULL,
  `changes`    JSON         NULL,
  `note`       VARCHAR(255) NULL,
  `created_at` DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `audit_log_ibfk_1_idx` (`user_id`),
  INDEX `audit_log_entity_idx` (`entity`, `entity_id`),
  INDEX `audit_log_created_at_idx` (`created_at`),

  CONSTRAINT `audit_log_ibfk_1`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
