-- Menetapkan jenis jasa CNC pada seluruh dokumen yang sudah menagih jasa
-- sebelum kolomnya ada.
--
-- PENETAPAN, BUKAN PENEMUAN. Jenis aslinya tidak pernah tercatat; keputusan
-- pemilik adalah menyeragamkannya ke CNC daripada meninggalkan sebagian besar
-- riwayat tanpa jenis.
--
-- Batasnya masih dapat diketahui, dan itu yang membuat penetapan ini bisa
-- dipertanggungjawabkan: kolomnya lahir pada migrasi 20260828020000, sehingga
-- SETIAP baris yang tersentuh di sini berasal dari sebelum tanggal itu. Jenis
-- jasa pada dokumen yang dibuat setelahnya selalu hasil pilihan orang.
--
-- Dijalankan terpisah dari migrasi kolomnya dengan sengaja: menambah kolom
-- kosong dan menulis nilai ke seribuan baris riwayat adalah dua keputusan yang
-- berbeda, dan yang kedua tidak boleh ikut terbawa diam-diam oleh yang pertama.
UPDATE `sales_invoice_code`
SET `service_type` = 'CNC'
WHERE `service` > 0 AND `service_type` IS NULL;

UPDATE `sales_deposit_code`
SET `service_type` = 'CNC'
WHERE `service` > 0 AND `service_type` IS NULL;
