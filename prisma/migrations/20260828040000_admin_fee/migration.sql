-- Biaya administrasi kartu kredit beda bank.
--
-- MENAMBAH tagihan pelanggan, sederajat dengan ongkos kirim dan jasa — bukan
-- potongan bank yang ditanggung toko. Karena itu ia ikut ke dalam total
-- faktur, piutang, dan seluruh kueri yang menghitung nilai faktur.
--
-- Bawaannya nol, sehingga seluruh faktur yang sudah ada tetap bernilai persis
-- sama seperti sebelumnya. Tidak ada riwayat yang berubah angkanya.
ALTER TABLE `sales_invoice_code` ADD COLUMN `admin_fee` DECIMAL(50,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE `sales_deposit_code` ADD COLUMN `admin_fee` DECIMAL(50,4) NOT NULL DEFAULT 0.0000;
