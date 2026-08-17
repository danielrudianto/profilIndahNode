-- ============================================================
--  Penambahan indeks — profil_indah
--  Disusun 14 Agustus 2026
--
--  JANGAN jalankan berkas ini sekaligus.
--  Kerjakan per bagian, baca hasilnya, baru lanjut ke bagian berikutnya.
--
--  Urutan yang benar:
--    Bagian 0  periksa keadaan sekarang
--    Bagian 1  ukur dulu (EXPLAIN sebelum)
--    Bagian 2  tambah indeks, satu per satu
--    Bagian 3  ukur lagi (EXPLAIN sesudah)
--    Bagian 4  cara membatalkan, kalau perlu
--
--  Coba di database salinan lebih dulu, bukan langsung produksi.
-- ============================================================


-- ============================================================
--  BAGIAN 0 — Periksa keadaan sekarang
-- ============================================================

-- 0.1 Indeks apa yang sudah ada. Kalau nama indeks di bawah sudah
--     muncul di sini, lewati pembuatannya.
SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('stock_out', 'stock_in', 'sales_invoice_code')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 0.2 Transaksi yang sedang berjalan lama.
--     Ini pemeriksaan TERPENTING sebelum menambah indeks. Penjelasannya
--     ada di catatan bagian 2.
--     Idealnya hasilnya kosong. Kalau ada baris dengan lama_detik besar,
--     tunggu sampai selesai sebelum melanjutkan.
SELECT trx_id,
       trx_started,
       TIMESTAMPDIFF(SECOND, trx_started, NOW()) AS lama_detik,
       trx_rows_modified,
       LEFT(trx_query, 80) AS query_singkat
FROM information_schema.INNODB_TRX
ORDER BY trx_started;

-- 0.3 Ruang disk kosong yang tersedia.
--     Pembuatan indeks butuh ruang sementara untuk mengurutkan.
--     Perkiraan kasar: sekitar ukuran kolom yang diindeks dikali jumlah baris.
--     Untuk stock_out ~930.000 baris, hitungan puluhan MB. Kecil,
--     tapi pastikan diska tidak sedang penuh.
SELECT TABLE_NAME,
       ROUND(DATA_LENGTH  / 1024 / 1024) AS data_mb,
       ROUND(INDEX_LENGTH / 1024 / 1024) AS indeks_mb,
       TABLE_ROWS AS perkiraan_baris
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('stock_out', 'stock_in', 'sales_invoice_code', 'stock_card');


-- ============================================================
--  BAGIAN 1 — Ukur dulu, sebelum diubah
--
--  Simpan hasilnya. Tanpa angka pembanding, kita tidak bisa tahu
--  apakah indeksnya benar-benar menolong atau cuma terasa menolong.
--
--  Yang perlu diperhatikan pada hasil EXPLAIN:
--    key   = indeks yang dipakai. NULL berarti tidak ada.
--    rows  = perkiraan baris yang harus diperiksa.
--    Extra = "Using filesort" berarti MySQL mengurutkan manual.
-- ============================================================

-- 1.1 Pencarian batch FIFO. Query ini dipanggil sangat sering
--     oleh calculateStockOut() setiap tengah malam.
--     Ganti angka 1 dengan product_id yang benar-benar ada.
EXPLAIN
SELECT * FROM stock_in
WHERE product_id = 1 AND residue > 0
ORDER BY date ASC
LIMIT 1;

-- 1.2 Laporan bulanan, BENTUK LAMA yang dipakai kode sekarang.
--     Membungkus kolom dalam fungsi membuat indeks tidak bisa dipakai.
--     Diperkirakan: key = NULL, rows mendekati jumlah seluruh baris.
EXPLAIN
SELECT COUNT(*) FROM stock_out
WHERE YEAR(stock_out.date) = 2026
  AND MONTH(stock_out.date) = 5;

-- 1.3 Laporan bulanan, BENTUK RENTANG.
--     Sebelum indeks ditambahkan, ini pun masih memindai penuh.
--     Sesudah indeks ditambahkan, ini yang berubah — sedangkan 1.2 tidak.
--     Perbedaan itulah alasan query di kode harus ikut diubah.
EXPLAIN
SELECT COUNT(*) FROM stock_out
WHERE date >= '2026-05-01' AND date < '2026-06-01';

-- 1.4 Penyaring tanggal pada faktur penjualan.
EXPLAIN
SELECT COUNT(*) FROM sales_invoice_code
WHERE date >= '2026-05-01' AND date < '2026-06-01'
  AND is_delete = 0;


-- ============================================================
--  BAGIAN 2 — Menambah indeks
--
--  Jalankan SATU PER SATU. Tunggu setiap perintah selesai dan catat
--  waktunya sebelum menjalankan yang berikutnya.
--
--  Tentang ALGORITHM=INPLACE, LOCK=NONE:
--    Keduanya ditulis eksplisit dengan sengaja. Kalau karena suatu hal
--    MySQL tidak bisa menambah indeks tanpa mengunci tabel, perintah ini
--    akan GAGAL dengan pesan galat — bukan diam-diam beralih ke cara
--    menyalin tabel yang memblokir penulisan. Gagal lebih baik daripada
--    membekukan tabel yang sedang dipakai.
--
--  Tentang lock_wait_timeout:
--    Ini penjagaan terhadap satu-satunya risiko nyata. Untuk mulai dan
--    mengakhiri, MySQL perlu metadata lock sesaat pada tabel. Kalau ada
--    transaksi lain yang masih memegang tabel itu, DDL menunggu — dan
--    selama menunggu, SEMUA query baru ke tabel tersebut ikut mengantre
--    di belakangnya. Tabel jadi seolah membeku padahal indeksnya belum
--    mulai dibuat.
--    Dengan batas 10 detik, skenario terburuknya adalah perintah ini
--    menyerah dan memberi galat, bukan menyeret sistem.
-- ============================================================

SET SESSION lock_wait_timeout = 10;

-- 2.1 Pencarian batch FIFO pada calculateStockOut().
--     Menyaring product_id dan residue, lalu mengurutkan date.
--     Indeks pada product_id saja (bawaan foreign key) tidak cukup —
--     MySQL tetap harus mengurutkan hasilnya.
--     Perkiraan: ~117.000 baris, hitungan detik.
ALTER TABLE stock_in
  ADD INDEX idx_stock_in_fifo (product_id, residue, date),
  ALGORITHM = INPLACE,
  LOCK = NONE;

-- 2.2 Penyaring tanggal pada stock_out.
--     PENTING: indeks ini TIDAK AKAN TERPAKAI selama kode masih memakai
--     YEAR() dan MONTH(). Penambahan indeks di sini hanyalah separuh
--     pekerjaan; separuh lainnya ada di
--     src/repositories/stock-out.repository.ts baris 261 dan 305.
--     Perkiraan: ~930.000 baris, hitungan puluhan detik.
ALTER TABLE stock_out
  ADD INDEX idx_stock_out_date (date),
  ALGORITHM = INPLACE,
  LOCK = NONE;

-- 2.3 Penyaring tanggal pada faktur penjualan.
--     Tabel ini punya enam indeks tetapi tidak satu pun pada date,
--     padahal date dipakai hampir semua laporan.
--     Perkiraan: ~380.000 baris, hitungan detik.
ALTER TABLE sales_invoice_code
  ADD INDEX idx_sic_date (date),
  ALGORITHM = INPLACE,
  LOCK = NONE;

-- Kembalikan ke nilai bawaan.
SET SESSION lock_wait_timeout = 31536000;


-- ============================================================
--  BAGIAN 3 — Ukur lagi
--
--  Jalankan ulang query EXPLAIN yang sama persis dari bagian 1,
--  lalu bandingkan angkanya.
--
--  Yang diharapkan:
--    1.1  key berubah jadi idx_stock_in_fifo, rows turun jauh
--    1.2  TIDAK BERUBAH — inilah buktinya query di kode harus diganti
--    1.3  key berubah jadi idx_stock_out_date, rows turun jauh
--    1.4  key berubah jadi idx_sic_date
--
--  Kalau 1.2 dan 1.3 sama-sama membaik, berarti ada yang keliru dalam
--  pembacaan — periksa lagi, jangan langsung disimpulkan berhasil.
-- ============================================================

-- 3.1 Pastikan ketiga indeks benar-benar terbentuk.
SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME IN ('idx_stock_in_fifo', 'idx_stock_out_date', 'idx_sic_date')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- 3.2 Perbarui statistik supaya perencana query memakai angka terbaru.
--     Ringan dan cepat, bukan membangun ulang tabel.
ANALYZE TABLE stock_in, stock_out, sales_invoice_code;

-- Lalu jalankan ulang 1.1 sampai 1.4 dan bandingkan.


-- ============================================================
--  BAGIAN 4 — Membatalkan
--
--  Menghapus indeks aman dan cepat, jauh lebih ringan daripada
--  membuatnya. Tidak ada data yang hilang — indeks hanyalah jalan
--  pintas menuju data, bukan datanya sendiri.
-- ============================================================

-- DROP INDEX idx_stock_in_fifo  ON stock_in;
-- DROP INDEX idx_stock_out_date ON stock_out;
-- DROP INDEX idx_sic_date       ON sales_invoice_code;


-- ============================================================
--  CATATAN
--
--  Harga yang dibayar. Indeks mempercepat pembacaan dan
--  memperlambat penulisan — setiap INSERT dan UPDATE harus ikut
--  memperbarui indeksnya. Tiga indeks pada tabel yang lebih banyak
--  dibaca daripada ditulis adalah pertukaran yang wajar, tetapi
--  bukan berarti gratis.
--
--  Waktu menjalankan. Pilih jam sepi, dan hindari sekitar tengah
--  malam: cron calculateStockOut() menulis banyak ke stock_out dan
--  stock_in pada jam 00:00.
--
--  Yang belum dijawab. Untuk stock_in, komposisi
--  (product_id, residue, date) dipilih dengan pertimbangan bahwa
--  himpunan batch bersisa jauh lebih kecil daripada seluruh batch
--  sebuah produk. Alternatifnya (product_id, date) menghindari
--  pengurutan tetapi harus memindai batch lama yang sudah habis.
--  Bagian 1.1 dan 3 ada supaya pilihan ini bisa dibuktikan dengan
--  angka, bukan diterima begitu saja.
-- ============================================================

-- ============================================================
--  BAGIAN 4 — Indeks penutup untuk laporan persediaan
--  (ditambahkan 2026-08-18, sesi optimasi)
--
--  report/inventory menghitung nilai stok per perusahaan lewat
--  tabel turunan: SELURUH stock_out yang ber-induk digrup per
--  stock_in_id dengan saringan tanggal. Indeks bawaan foreign key
--  hanya memuat stock_in_id, sehingga date dan quantity tetap
--  diambil dari barisnya satu per satu. Indeks penutup di bawah
--  membuat seluruh tabel turunan itu terjawab dari indeksnya saja.
--
--  Terukur pada salinan produksi: report/inventory 1,65 dtk -> 0,46 dtk.
--  Perkiraan durasi pembuatan: ~6 detik pada ~930.000 baris.
-- ============================================================

SET SESSION lock_wait_timeout = 10;

ALTER TABLE stock_out
  ADD INDEX idx_stock_out_induk (stock_in_id, date, quantity),
  ALGORITHM = INPLACE,
  LOCK = NONE;

SET SESSION lock_wait_timeout = 31536000;
