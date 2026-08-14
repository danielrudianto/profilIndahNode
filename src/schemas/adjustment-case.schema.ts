import { z } from "zod";
import ErrorList from "../constants/error_list";
import { present, int, requiredInt, required } from "./common.schema";

/**
 * Kontrak API untuk domain penyesuaian stok.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan.
 *
 * Kebijakan ketat pada req.body berlaku di sini — lihat penjelasannya di
 * common.schema.ts. Angka yang dikirim sebagai teks ditolak, begitu pula
 * boolean palsu seperti "true".
 */

/**
 * Bilangan pecahan dengan dua pesan berbeda, meniru pasangan notEmpty() lalu
 * isFloat({ min }).
 *
 * Pecahan memang diterima di sini: penyesuaian bisa berupa 1.5 dus. Nol juga
 * sah, persis seperti rantai lama — notEmpty() meloloskan 0 karena nilainya
 * diubah menjadi teks "0" lebih dulu, dan isFloat({ min: 0 }) menerimanya.
 */
const desimalWajib = (pesanKosong: string, pesanSalah: string, min: number) =>
  z
    .number({
      error: (iss) =>
        iss.input === undefined || iss.input === null || iss.input === ""
          ? pesanKosong
          : pesanSalah,
    })
    .min(min, pesanSalah);

/**
 * Nilai numerik dari teks — meniru isNumeric(), bukan isInt().
 *
 * Berbeda dari intFromText, isNumeric() pada rantai lama meloloskan pecahan
 * dan bilangan negatif: "1.5" dan "-1" keduanya diterima. Notasi eksponen
 * seperti "1e3" justru ditolak, karena isNumeric() memakai pola desimal
 * sederhana dan bukan Number().
 *
 * Kelonggaran itu dipertahankan supaya status dan pesan tidak berubah. Ia
 * memang cacat — id -1 dan 1.5 tetap sampai ke lapisan basis data — tetapi
 * memperbaikinya adalah keputusan tersendiri, bukan bagian dari migrasi ini.
 */
const numericFromText = (pesan: string) =>
  z
    .any()
    .superRefine((nilai, ctx) => {
      const teks = nilai === undefined || nilai === null ? "" : String(nilai);
      if (!/^[+-]?(\d*\.)?\d+$/.test(teks)) {
        ctx.addIssue({ code: "custom", message: pesan });
      }
    })
    .transform((nilai) => Number(nilai));

/**
 * Periode arsip.
 *
 * Disebarkan dengan `...shape` dan bukan `.extend()` supaya year dan month
 * tetap berada di urutan pertama — urutan itulah yang menentukan pesan mana
 * yang muncul lebih dulu.
 */
const periodeArsip = z.object({
  year: requiredInt(
    ErrorList["Year is required"],
    ErrorList["Year must be numeric"],
    2000
  ),
  month: requiredInt(
    ErrorList["Month is required"],
    ErrorList["Month must be numeric"],
    1,
    12
  ),
});

/**
 * POST /adjustment-case/archives
 *
 * Kelima penyaring boolean hanya memakai isBoolean(), tanpa exists() seperti
 * pada arsip faktur. Bedanya tidak terasa: isBoolean() juga gagal untuk nilai
 * yang tidak dikirim, sehingga kelimanya tetap wajib.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA: isBoolean() meloloskan "true", 1, dan 0
 * karena express-validator mengubah nilainya menjadi teks lebih dulu.
 * z.boolean() menolak ketiganya.
 *
 * Perhatikan pula bahwa isLost dan isFound memakai pesan sendiri, sedangkan
 * ketiga penyaring status memakai "Parameter error" yang sama.
 */
export const archiveAdjustmentCaseSchema = z.object({
  ...periodeArsip.shape,
  isConfirm: z.boolean({ error: ErrorList["Parameter error"] }),
  isReject: z.boolean({ error: ErrorList["Parameter error"] }),
  isPending: z.boolean({ error: ErrorList["Parameter error"] }),
  isLost: z.boolean({
    error: ErrorList["Adjustment case lost type must be boolean"],
  }),
  isFound: z.boolean({
    error: ErrorList["Adjustment case found type must be boolean"],
  }),
  sortBy: required(ErrorList["Sort by required"]),
  sortDirection: z.enum(["asc", "desc"], {
    error: ErrorList["Sort direction only supports ascending or descending"],
  }),
});

/**
 * Badan permintaan POST /approve dan POST /reject.
 *
 * Keduanya memakai rantai yang sama persis, jadi satu skema dipakai bersama.
 * `id` di sini datang dari req.body, bukan req.params, sehingga kebijakan
 * ketat berlaku: "5" ditolak.
 */
export const bodyIdAdjustmentCaseSchema = z.object({
  id: requiredInt(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    0
  ),
});

/**
 * POST /adjustment-case
 *
 * Rantai lama memakai sintaks joker express-validator: body("adjustment_case.
 * *.product_id"). Di sini diterjemahkan menjadi larik objek.
 *
 * Tiga sifat rantai lama sengaja dipertahankan:
 *
 * 1. Larik KOSONG lolos tanpa diperiksa. express-validator memperlakukan
 *    bidang berisi larik sebagai KUMPULAN nilai, jadi larik tanpa anggota
 *    tidak menyentuh satu aturan pun. z.array() tanpa .min() sama.
 * 2. Anggota yang bukan objek — misalnya `[1]` — menghasilkan "Product ID is
 *    required", karena pada rantai lama jalur adjustment_case.0.product_id
 *    bernilai undefined.
 * 3. product_id hanya diperiksa keberadaannya dan product_unit_id hanya
 *    diperiksa dengan exists(), sehingga teks kosong pada product_unit_id
 *    tetap lolos. Keduanya memakai required dan present, bukan bilangan.
 *
 * Yang TIDAK dipertahankan adalah urutan pesan antar anggota; lihat catatan di
 * tests/adjustment-case.schema.test.ts.
 */
export const createAdjustmentCaseSchema = z.object({
  date: required(ErrorList["Date required"]),
  type: int(ErrorList["Adjustment case type is required"], 0),
  adjustment_case: z.array(
    z.object(
      {
        product_id: required(ErrorList["Product ID is required"]),
        quantity: desimalWajib(
          ErrorList["Quantity is required"],
          ErrorList["Quantity must be numeric"],
          0
        ),
        product_unit_id: present(ErrorList["Product unit ID is required"]),
      },
      { error: ErrorList["Product ID is required"] }
    ),
    { error: ErrorList["Parameter error"] }
  ),
});

/**
 * Parameter `:id` pada GET /:id dan DELETE /:id.
 *
 * Keduanya hanya memasang isNumeric() dengan pesan "Parameter error" — tanpa
 * notEmpty() dan tanpa batas bawah. Lihat catatan pada numericFromText.
 */
export const paramAdjustmentCaseSchema = z.object({
  id: numericFromText(ErrorList["Parameter error"]),
});

export type ArchiveAdjustmentCase = z.infer<typeof archiveAdjustmentCaseSchema>;
export type BodyIdAdjustmentCase = z.infer<typeof bodyIdAdjustmentCaseSchema>;
export type CreateAdjustmentCase = z.infer<typeof createAdjustmentCaseSchema>;
export type ParamAdjustmentCase = z.infer<typeof paramAdjustmentCaseSchema>;
