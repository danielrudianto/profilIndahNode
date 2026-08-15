-- Pelanggan dengan pembelian terbesar, Maret 2026 - Juli 2026.
--
-- Merek digabung: tidak ada pemecahan per merek maupun per produk.
--
-- CARA MENGHITUNG NILAINYA mengikuti perhitungan aplikasi sendiri, bukan versi
-- baru — lihat receivable.createPayment dan sales-deposit.confirm:
--
--     jumlah baris barang  = SUM(quantity x (price - discount))
--     nilai faktur         = jumlah baris + delivery + service - discount
--
-- delivery, service, dan discount berada di KEPALA faktur, jadi ditambahkan
-- sekali per faktur. Menjumlahkannya bersama baris barang tanpa mengelompokkan
-- dulu akan menggandakannya sebanyak jumlah baris — faktur dengan 20 barang
-- akan dihitung ongkos kirimnya 20 kali.
--
-- RETUR DIKURANGI. Angka ini adalah pembelian bersih: barang yang dikembalikan
-- pelanggan tidak dihitung sebagai pembelian. Retur dinilai dengan harga baris
-- aslinya, sehingga sepadan dengan cara fakturnya dihitung.
-- Untuk angka KOTOR (tanpa pengurangan retur), hapus blok retur dan kolom
-- nilai_retur, lalu pakai total_kotor sebagai hasil akhir.
--
-- Faktur yang dihapus (is_delete = 1) tidak ikut. Retur yang belum
-- dikonfirmasi juga tidak ikut dikurangkan.
--
-- Pelanggan kosong (customer_id NULL) adalah penjualan RETAIL — pembeli tanpa
-- data pelanggan. Barisnya sengaja tetap ditampilkan agar terlihat besarnya,
-- bukan disembunyikan; buang baris terakhir pada WHERE bila tidak diinginkan.

SELECT
  COALESCE(c.name, 'RETAIL (tanpa data pelanggan)') AS pelanggan,
  COUNT(DISTINCT f.id)                              AS jumlah_faktur,
  ROUND(SUM(f.nilai_kotor), 2)                      AS total_kotor,
  ROUND(COALESCE(SUM(r.nilai_retur), 0), 2)         AS nilai_retur,
  ROUND(SUM(f.nilai_kotor) - COALESCE(SUM(r.nilai_retur), 0), 2) AS total_bersih
FROM (
  -- Nilai per faktur: baris barang dijumlahkan dulu, baru ongkos kepala
  -- ditambahkan sekali.
  SELECT
    sic.id,
    sic.customer_id,
    COALESCE(SUM(si.quantity * (si.price - si.discount)), 0)
      + sic.delivery + sic.service - sic.discount AS nilai_kotor
  FROM sales_invoice_code sic
  LEFT JOIN sales_invoice si ON si.sales_invoice_code_id = sic.id
  WHERE sic.is_delete = 0
    AND sic.date >= '2026-03-01'
    AND sic.date <  '2026-08-01'
  GROUP BY sic.id, sic.customer_id, sic.delivery, sic.service, sic.discount
) f
LEFT JOIN (
  -- Nilai retur per faktur, dihitung dengan harga baris aslinya.
  SELECT
    src.sales_invoice_code_id,
    SUM(sr.quantity * (si.price - si.discount)) AS nilai_retur
  FROM sales_return_code src
  JOIN sales_return sr ON sr.sales_return_code_id = src.id
  JOIN sales_invoice si ON si.id = sr.sales_invoice_id
  WHERE src.is_delete = 0
    AND src.is_confirm = 1
  GROUP BY src.sales_invoice_code_id
) r ON r.sales_invoice_code_id = f.id
LEFT JOIN customer c ON c.id = f.customer_id
GROUP BY f.customer_id, c.name
ORDER BY total_bersih DESC
LIMIT 20;
