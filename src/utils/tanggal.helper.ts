/**
 * Rentang tanggal untuk penyaringan periode.
 *
 * Selalu berbentuk setengah terbuka: `>= mulai` dan `< sebelum`. Bentuk ini
 * dipilih karena dua alasan.
 *
 * Pertama, ia menghindari kesalahan batas atas. Menulis batas sebagai "hari
 * terakhir bulan" menggoda tetapi meleset: pada kolom DATETIME, `<= 31 Mei`
 * berarti `<= 31 Mei pukul 00:00`, sehingga seluruh isi hari itu terlewat.
 * Kesalahan ini pernah terjadi di stock-out.repository.ts, di mana batas
 * atasnya ditulis `new Date(year, month, 0)` — yang menghasilkan 31 Mei, bukan
 * 1 Juni — sehingga nilai hari terakhir setiap bulan hilang dari perhitungan
 * tanpa galat apa pun.
 *
 * Kedua, ia memungkinkan MySQL memakai indeks. Membungkus kolom dalam fungsi
 * seperti `YEAR(date) = 2026 AND MONTH(date) = 5` membuat indeks pada kolom
 * itu tidak bisa dipakai sama sekali, sehingga seluruh tabel dipindai.
 *
 * Kalau helper ini diganti kembali menjadi perbandingan pada hasil fungsi,
 * kedua masalah itu kembali sekaligus.
 */

/** Nilai batas periode, siap disisipkan sebagai parameter query. */
export interface RentangTanggal {
  /** Awal periode, ikut terhitung. */
  mulai: Date;
  /** Batas atas, TIDAK ikut terhitung. */
  sebelum: Date;
}

/**
 * Rentang satu bulan penuh.
 *
 * @param year  tahun penuh, misalnya 2026
 * @param month bulan 1-12. Perhatikan: sebagian pemanggil di repo ini
 *              menyimpan bulan sebagai 0-11 dan menambahkan 1 saat memanggil.
 *              Fungsi ini selalu mengharapkan 1-12.
 */
export function rentangBulan(year: number, month: number): RentangTanggal {
  return {
    mulai: new Date(year, month - 1, 1),
    sebelum: new Date(year, month, 1),
  };
}

/** Rentang satu tahun penuh. */
export function rentangTahun(year: number): RentangTanggal {
  return {
    mulai: new Date(year, 0, 1),
    sebelum: new Date(year + 1, 0, 1),
  };
}
