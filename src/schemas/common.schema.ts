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
