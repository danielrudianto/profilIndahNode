-- Alamat asal permintaan pada jejak audit.
--
-- NULL bukan kelainan: perintah CLI dan pekerjaan worker menulis ke basis
-- data tanpa permintaan HTTP sama sekali, dan jejaknya tetap dicatat — hanya
-- tanpa alamat. Baris yang sudah ada juga NULL, karena kolomnya memang belum
-- ada saat itu.
--
-- VARCHAR(45) cukup untuk IPv6 terpanjang, termasuk bentuk ::ffff:1.2.3.4
-- yang dipakai Node ketika klien IPv4 tersambung lewat soket IPv6.
ALTER TABLE `audit_log` ADD COLUMN `ip` VARCHAR(45) NULL;
