import { z } from "zod";
import ErrorList from "../constants/error_list";

/**
 * Potongan skema yang dipakai berulang di banyak domain.
 *
 * Sebelumnya aturan yang sama ditulis ulang di tiap berkas route — validasi
 * bulan dan tahun saja muncul belasan kali dengan kata-kata yang sedikit
 * berbeda. Menyatukannya di sini membuat satu perubahan berlaku di semua
 * tempat, dan membuat berkas route kembali berisi routing saja.
 *
 * Pesan galat diambil dari ErrorList supaya kalimat yang dilihat pengguna
 * tidak berubah dibanding validasi sebelumnya.
 */

/**
 * KEBIJAKAN KETAT PADA req.body — BERLAKU DI SELURUH SKEMA.
 *
 * express-validator mengubah setiap nilai menjadi teks SEBELUM memeriksanya.
 * Akibatnya `isInt()` meloloskan "5" persis seperti 5, dan `notEmpty()`
 * meloloskan angka 123 maupun objek (yang menjadi "[object Object]"). Skema di
 * bawah ini TIDAK menirunya: pada req.body dipakai z.number() dan z.string()
 * yang menolak keduanya.
 *
 * Ini perubahan perilaku yang DISENGAJA, bukan kelalaian:
 *
 *   { month: "5" }        dulu 200, sekarang 400 validation.month.numeric
 *   { name: 123 }         dulu 200, sekarang 400 validation.name.required
 *   { name: {a:1} }       dulu 200 dan tersimpan sebagai "[object Object]"
 *
 * Alasannya, nilai yang lolos lewat pemaksaan tipe tidak berhenti di lapisan
 * validasi: `page` berupa teks ikut masuk ke aritmatika offset, dan nama
 * berupa objek benar-benar tersimpan. JSON sudah membawa tipe aslinya, jadi
 * menerima teks hanya menyembunyikan cacat di sisi pemanggil.
 *
 * KONSEKUENSI RILIS: klien yang mengirim angka sebagai teks akan mulai
 * menerima 400. Perubahan ini harus naik bersama frontend, sama seperti
 * peralihan ErrorList ke key i18n.
 *
 * Yang TIDAK terkena kebijakan ini adalah req.params dan req.query — di sana
 * nilai memang selalu teks dan tidak ada tipe asli yang bisa dipertahankan.
 * Gunakan varian *DariTeks untuk keduanya.
 */

/**
 * Bilangan bulat dari sumber teks.
 *
 * Nilai pada req.params dan req.query selalu berupa string, bahkan untuk
 * angka. z.number() akan menolak semuanya, jadi nilainya perlu dipaksa dulu.
 * Pemaksaan sengaja tidak dipakai pada req.body: di sana JSON sudah membawa
 * tipe aslinya, dan menerima "5" sebagai angka akan menyembunyikan kesalahan
 * di sisi pemanggil.
 */
export const intDariTeks = (pesan: string, min = 0) =>
  z.coerce.number({ error: pesan }).int(pesan).min(min, pesan);

/** Bilangan bulat dari badan JSON, tanpa pemaksaan tipe. */
export const int = (pesan: string, min = 0) =>
  z.number({ error: pesan }).int(pesan).min(min, pesan);

/**
 * Bilangan bulat dengan dua pesan berbeda: satu untuk nilai yang tidak dikirim
 * sama sekali, satu untuk nilai yang dikirim tetapi tidak sah.
 *
 * Rantai validator lama selalu memasang dua aturan berurutan pada bidang yang
 * sama — notEmpty() lalu isInt() — masing-masing dengan pesannya sendiri.
 * Skema dengan satu pesan saja akan mengubah kalimat yang dilihat pengguna
 * ketika bidangnya tidak dikirim.
 */
export const intWajib = (
  pesanKosong: string,
  pesanSalah: string,
  min: number,
  max?: number
) => {
  let skema = z
    .number({
      error: (iss) =>
        iss.input === undefined || iss.input === null || iss.input === ""
          ? pesanKosong
          : pesanSalah,
    })
    .int(pesanSalah)
    .min(min, pesanSalah);

  return max === undefined ? skema : skema.max(max, pesanSalah);
};

/**
 * Sama seperti intWajib, untuk nilai yang datang sebagai teks (req.query).
 *
 * Tidak memakai z.coerce. Pemaksaan tipe dijalankan SEBELUM validasi, sehingga
 * nilai yang tidak dikirim berubah menjadi NaN lebih dulu dan tidak lagi bisa
 * dibedakan dari nilai yang salah bentuk seperti "abc". Padahal keduanya harus
 * menghasilkan pesan yang berbeda, mengikuti rantai notEmpty() lalu isInt().
 *
 * Karena itu nilai mentahnya diperiksa sendiri di sini, baru diubah ke angka.
 */
export const intWajibDariTeks = (
  pesanKosong: string,
  pesanSalah: string,
  min: number,
  max?: number
) =>
  z
    .any()
    .superRefine((nilai, ctx) => {
      if (nilai === undefined || nilai === null || nilai === "") {
        ctx.addIssue({ code: "custom", message: pesanKosong });
        return;
      }

      const angka = Number(nilai);
      const sah =
        Number.isInteger(angka) &&
        angka >= min &&
        (max === undefined || angka <= max);

      if (!sah) {
        ctx.addIssue({ code: "custom", message: pesanSalah });
      }
    })
    .transform((nilai) => Number(nilai));

/** Teks yang tidak boleh kosong maupun hanya berisi spasi. */
export const teksWajib = (pesan: string) =>
  z
    .string({ error: pesan })
    .refine((nilai) => nilai.trim().length > 0, { message: pesan });

/**
 * Nilai yang harus ada dan tidak kosong — meniru notEmpty() apa adanya,
 * termasuk kelonggarannya terhadap tipe.
 *
 * Dipakai pada bidang yang rantai lamanya memang hanya memeriksa keberadaan
 * dan belum bisa diketatkan tanpa membahasnya dengan sisi klien lebih dulu.
 * Untuk bidang teks yang jelas harus berupa teks, pakai teksWajib.
 */
export const wajibAda = (pesan: string) =>
  z
    .any()
    .refine(
      (nilai) => nilai !== undefined && nilai !== null && String(nilai) !== "",
      { message: pesan }
    );

/** Nilai yang harus ada — meniru exists(); teks kosong tetap lolos. */
export const harusAda = (pesan: string) =>
  z.any().refine((nilai) => nilai !== undefined, { message: pesan });

/** Parameter jalur `:id`. */
export const paramId = z.object({
  id: intDariTeks(ErrorList["Parameter error"]),
});

/**
 * Penyaring daftar bertingkat.
 *
 * Ketiganya opsional: bila tidak dikirim, controller memakai nilai bawaan
 * lewat translatePage/translatePageSize/translateKeyword.
 */
export const kueriDaftar = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  keyword: z.string().optional(),
});

/**
 * Periode bulan dan tahun.
 *
 * Bulan memakai rentang 1-12. Sebagian pemanggil lama menyimpan bulan sebagai
 * 0-11 lalu menambahkan 1 sebelum memanggil; yang sampai ke sini harus sudah
 * dalam 1-12.
 */
export const periodeBulan = z.object({
  month: int(ErrorList["Month must be numeric"], 1).max(
    12,
    ErrorList["Month must be numeric"]
  ),
  year: int(ErrorList["Year must be numeric"], 2000),
});
