import { formatDate } from "../constants/date-format.constant";
import { RentangTanggal } from "../interfaces/date.interface";

export { formatDate };

/**
 * Seluruh utilitas tanggal berkumpul di berkas ini.
 *
 * Sebelumnya terbelah dua: DateHelper di date.helper.ts dan rentangBulan /
 * rentangTahun di tanggal.helper.ts. Pemisahnya bukan urusan yang berbeda
 * melainkan bahasa penamaannya, dan stock-out.repository.ts mengimpor dari
 * kedua berkas sekaligus.
 */
export class DateHelper {
  /** Ubah objek Date menjadi teks sesuai format yang diminta. */
  static convertDate(date: Date, format: formatDate) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (format) {
      case formatDate.DDMMYYYY:
        return `${day.toString().padStart(2, "0")}-${(month + 1)
          .toString()
          .padStart(2, "0")}-${year}`;
      case formatDate.YYYYMMDD:
        return `${year}-${(month + 1).toString().padStart(2, "0")}-${day
          .toString()
          .padStart(2, "0")}`;
      default:
        break;
    }
  }
}

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
