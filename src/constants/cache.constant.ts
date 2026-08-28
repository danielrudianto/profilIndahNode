/*
  Umur cache Redis untuk laporan yang mahal dihitung (menyisir jutaan
  baris stock_out). Lima menit: cukup panjang supaya klik bolak-balik
  tanggal terasa instan, cukup pendek supaya dokumen susulan tidak lama
  tersembunyi.
*/
export const UMUR_CACHE_LAPORAN = 300;

/*
  Arsip tahunan faktur penjualan: jumlah faktur per bulan untuk pemilih
  tahun/bulan. Kueri ini menyapu SELURUH sales_invoice_code — sekitar 380.000
  baris — tanpa satu pun WHERE, dan tidak bisa dipersempit karena memang
  jawabannya seluruh riwayat.

  Isinya nyaris tidak pernah berubah: hanya ketika sebuah faktur lahir atau
  dihapus. Karena itu kuncinya DIBATALKAN pada pembuatan faktur, dan umurnya
  hanya jaring pengaman untuk jalur perubahan lain yang tidak memanggilnya.
*/
export const UMUR_CACHE_ARSIP = 300;
export const KUNCI_CACHE_ARSIP_FAKTUR = "arsip:sales-invoice";

/*
  Laporan laba rugi. Jauh lebih panjang daripada lima menit milik laporan lain,
  dan itu disengaja: kueri HPP-nya menyisir seluruh stock_out sebulan, sehingga
  dengan umur pendek pemakainya tetap menunggu lama hampir setiap kali membuka
  halaman — persis keluhan yang membuat cache ini ada.

  Angka laba rugi juga bukan angka yang dipakai memutuskan sesuatu dalam
  hitungan menit. Yang penting pembacanya TAHU angkanya dihitung kapan, dan
  itu ikut dikirim bersama datanya; ada pula tombol hitung ulang bagi yang
  butuh angka terbaru saat itu juga.
*/
export const UMUR_CACHE_LABA_RUGI = 43200;
