-- Jenis jasa pada faktur penjualan.
--
-- Nilainya kode teks ('CNC', 'FRAME', 'SOLID'), bukan angka urut: laporan
-- keuangan ditulis dengan SQL mentah, dan kode yang terbaca menghemat satu
-- lompatan ke berkas konstanta setiap kali seseorang membuka basis data.
--
-- NULL untuk seluruh baris yang sudah ada. Faktur lama memang menagih jasa
-- tanpa pernah menyebut jenisnya — kolomnya belum ada saat itu — dan menebak
-- jenisnya sekarang berarti mengarang catatan.
ALTER TABLE `sales_invoice_code` ADD COLUMN `service_type` VARCHAR(20) NULL;

-- Setoran yang dikonfirmasi melahirkan faktur, dan setoran punya biaya
-- jasanya sendiri. Tanpa kolom ini jalur tersebut akan terus melahirkan jasa
-- tanpa jenis — bukan peninggalan masa lalu, melainkan lubang yang menganga
-- terus.
ALTER TABLE `sales_deposit_code` ADD COLUMN `service_type` VARCHAR(20) NULL;
