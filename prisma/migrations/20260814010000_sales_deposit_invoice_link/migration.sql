-- Kaitan setoran ke faktur yang lahir darinya.
--
-- Sebelum ini kaitannya hanya tersirat lewat penomoran: faktur hasil konfirmasi
-- setoran sengaja diberi nomor berawalan DPS- supaya ketahuan asalnya. Akibatnya
-- penomoran faktur menjadi tidak berurutan dan dua jenis dokumen berbeda berbagi
-- ruang nomor yang sama. Kaitannya kini dinyatakan lewat kolom ini.
--
-- Kolomnya NULL-able dan tanpa nilai bawaan, jadi penambahannya tidak menyentuh
-- baris yang sudah ada. Setoran lama tidak diisi surut: kaitannya di sana tetap
-- hanya lewat nomor DPS- yang telanjur beredar, dan menebaknya dari kecocokan
-- nomor berisiko salah pasang.

ALTER TABLE `sales_deposit_code`
  ADD COLUMN `sales_invoice_code_id` INT NULL;

CREATE INDEX `deposit_code_ibfk_4_idx`
  ON `sales_deposit_code` (`sales_invoice_code_id`);

ALTER TABLE `sales_deposit_code`
  ADD CONSTRAINT `deposit_code_ibfk_4`
  FOREIGN KEY (`sales_invoice_code_id`) REFERENCES `sales_invoice_code` (`id`)
  ON DELETE NO ACTION ON UPDATE NO ACTION;
