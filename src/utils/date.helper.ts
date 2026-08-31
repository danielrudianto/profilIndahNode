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

/**
 * Rentang satu bulan penuh, berlabuh pada UTC.
 *
 * Kembarannya di atas, `rentangBulan`, membangun batas memakai konstruktor
 * waktu lokal. Itu benar selama hasilnya dibaca kembali secara lokal — dan
 * memang begitu pada jalur $queryRaw di repo ini, yang selalu melewatkannya
 * ke DateHelper.convertDate (getFullYear/getMonth/getDate, semuanya lokal).
 * Bolak-balik dengan aturan yang sama, geserannya saling meniadakan.
 *
 * Yang tidak boleh memakainya adalah penyaring `where` milik Prisma. Kolom
 * tanggal di sini bertipe @db.Date, dan Prisma menyerialkan Date ke UTC.
 * Pada mesin UTC+8, `new Date(2026, 8, 0)` berarti 31 Agustus pukul 00:00
 * WITA — yaitu 30 Agustus pukul 16:00 UTC, dan bagi Prisma tanggalnya 30,
 * bukan 31. Batas atas mundur sehari tanpa galat apa pun: dokumen hari
 * terakhir setiap bulan hilang dari arsip, dan dokumen hari terakhir bulan
 * sebelumnya justru ikut muncul karena batas bawahnya mundur juga.
 *
 * Fungsi ini memakai Date.UTC supaya batasnya bertemu kolomnya pada aturan
 * yang sama. Bentuknya tetap setengah terbuka: `>= mulai` dan `< sebelum`.
 *
 * @param year  tahun penuh, misalnya 2026
 * @param month bulan 1-12
 */
export function rentangBulanUTC(year: number, month: number): RentangTanggal {
  return {
    mulai: new Date(Date.UTC(year, month - 1, 1)),
    sebelum: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Rentang satu tahun penuh, berlabuh pada UTC.
 *
 * Kembaran tahunan dari rentangBulanUTC, dengan alasan yang sama: penyaring
 * `where` milik Prisma membandingkan kolom @db.Date yang dibaca sebagai
 * tengah malam UTC, sehingga batas yang dibangun di zona lokal meleset
 * sehari.
 *
 * @param year tahun penuh, misalnya 2026
 */
export function rentangTahunUTC(year: number): RentangTanggal {
  return {
    mulai: new Date(Date.UTC(year, 0, 1)),
    sebelum: new Date(Date.UTC(year + 1, 0, 1)),
  };
}
