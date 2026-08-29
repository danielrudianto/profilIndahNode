/*
  Umur cache Redis untuk laporan persediaan, yang menyisir jutaan baris
  stock_out.

  DUA PULUH EMPAT JAM, naik dari lima menit. Keputusan pemiliknya, dan
  alasannya lurus: persediaan tidak pernah dibaca sebagai angka detik ini —
  ia dibaca untuk memutuskan pembelian, dan keputusan itu tidak berubah
  karena satu faktur sore tadi. Lima menit berarti hampir setiap pembuka
  halaman pertama di hari itu tetap menunggu penuh, dan yang paling sering
  menunggu justru orang yang membukanya paling pagi.

  Laporan penjualan dan pembelian punya umurnya sendiri di bawah — di sana
  kesegaran memang lebih berarti.
*/
export const UMUR_CACHE_LAPORAN = 86400;

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

/*
  Laporan penjualan dan pembelian — dua umur, dipilih menurut bulan yang
  diminta.

  Bulan yang sudah lewat tidak akan berubah lagi, jadi umurnya panjang; satu
  halaman meminta tiga bulan sekaligus, dan dua di antaranya selalu bulan mati.

  Bulan berjalan SATU JAM, naik dari lima menit. Ongkosnya hanya terjadi
  ketika ada yang membuka halamannya — tidak ada yang membuka berarti tidak
  ada yang dihitung — sehingga umur yang lebih panjang tidak menahan pekerjaan
  siapa pun, ia hanya mengurangi berapa kali hal yang sama dihitung ulang.

  Laporan ini juga dihangatkan tiap jam tiga pagi, jadi angkanya sudah siap
  sebelum orang pertama datang.
*/
export const UMUR_CACHE_LAPORAN_BERJALAN = 3600;
export const UMUR_CACHE_LAPORAN_LAMPAU = 43200;
