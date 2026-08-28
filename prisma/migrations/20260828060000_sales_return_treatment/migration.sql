-- Retur penjualan: berapa yang memotong tagihan, berapa yang jadi kelebihan bayar.
--
-- Dua angka, bukan satu penanda perlakuan. Sebuah retur yang nilainya melebihi
-- sisa tagihan memang dua-duanya sekaligus — sebagian melunasi, sisanya menjadi
-- kelebihan bayar — dan penanda tunggal tidak bisa menyatakan itu tanpa
-- berbohong tentang salah satunya.
--
-- Bawaannya nol, dan seluruh baris lama tetap nol. Itu BUKAN kelalaian: retur
-- sebelum ini memang mengeluarkan uang saat itu juga lewat payment_method_id
-- tanpa pernah menyentuh piutang. Menandainya sebagai "memotong piutang"
-- sekarang akan mengubah sisa tagihan tujuh pelanggan secara diam-diam, atas
-- peristiwa yang tidak pernah terjadi.
ALTER TABLE `sales_return_code`
  ADD COLUMN `receivable_value` DECIMAL(15,4) NOT NULL DEFAULT 0.0000,
  ADD COLUMN `overpayment_value` DECIMAL(15,4) NOT NULL DEFAULT 0.0000;

-- Kelebihan bayar yang lahir dari retur bisa ditelusuri balik ke returnya.
-- Sebelumnya overpayment hanya mengenal asal-usul dari setoran.
ALTER TABLE `overpayment` ADD COLUMN `sales_return_code_id` INT NULL;
ALTER TABLE `overpayment`
  ADD CONSTRAINT `overpayment_code_ibfk5`
  FOREIGN KEY (`sales_return_code_id`) REFERENCES `sales_return_code` (`id`);
