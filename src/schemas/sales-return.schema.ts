import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredInt, requiredIntFromText, required } from "./common.schema";

/**
 * Kontrak API untuk domain retur penjualan.
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
 * Sama seperti requiredInt, tetapi pecahan memang diterima: kuantitas retur bisa
 * berupa 1.5 dus. Yang ditolak hanyalah nilai di bawah `min` dan bukan-angka.
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
 * Periode arsip.
 *
 * Dipakai sebagai awalan POST /archives. Disebarkan dengan `...shape` dan
 * bukan `.extend()` supaya year dan month tetap berada di urutan pertama —
 * urutan itulah yang menentukan pesan mana yang muncul lebih dulu.
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
 * POST /sales-return/archives
 *
 * Rantai lama memeriksa kedua penyaring boolean dalam dua gelombang: dua
 * `exists()` lebih dulu, baru dua `isBoolean()`. Di sini keduanya menyatu per
 * bidang. Pesannya tetap sama karena keempat aturan itu memakai "Parameter
 * error" yang identik, sehingga gelombang mana pun yang gagal lebih dulu
 * menghasilkan kalimat yang sama.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA: isBoolean() meloloskan "true", 1, dan 0
 * karena express-validator mengubah nilainya menjadi teks lebih dulu.
 * z.boolean() menolak ketiganya.
 */
export const archiveSalesReturnSchema = z.object({
  ...periodeArsip.shape,
  isActive: z.boolean({ error: ErrorList["Parameter error"] }),
  isDelete: z.boolean({ error: ErrorList["Parameter error"] }),
  sortBy: required(ErrorList["Sort by required"]),
  sortDirection: z.enum(["asc", "desc"], {
    error: ErrorList["Sort direction only supports ascending or descending"],
  }),
});

/**
 * POST /sales-return
 *
 * Rantai lama memakai sintaks joker express-validator: body("sales_return.*.
 * sales_invoice_id"). Di sini diterjemahkan menjadi larik objek.
 *
 * Dua sifat rantai lama sengaja dipertahankan:
 *
 * 1. Larik KOSONG lolos tanpa diperiksa. express-validator memperlakukan
 *    bidang berisi larik sebagai KUMPULAN nilai dan memeriksa tiap anggotanya,
 *    jadi larik tanpa anggota tidak menyentuh satu aturan pun. z.array() tanpa
 *    .min() berperilaku sama.
 * 2. Anggota yang bukan objek — misalnya `[1]` — menghasilkan "Sales invoice ID
 *    is required", karena pada rantai lama jalur sales_return.0.sales_invoice_id
 *    bernilai undefined. Karena itu z.object() di bawah memasang pesan yang
 *    sama pada galat tipenya sendiri.
 *
 * Yang TIDAK dipertahankan adalah urutan pesan antar anggota; lihat catatan di
 * tests/sales-return.schema.test.ts.
 */
export const createSalesReturnSchema = z.object({
  date: required(ErrorList["Date required"]),
  payment_method_id: requiredInt(
    ErrorList["Payment method required"],
    ErrorList["Payment method must be numeric"],
    0
  ),
  sales_return: z.array(
    z.object(
      {
        sales_invoice_id: requiredInt(
          ErrorList["Sales invoice ID is required"],
          ErrorList["Sales invoice ID must be numeric"],
          1
        ),
        quantity: desimalWajib(
          ErrorList["Quantity is required"],
          ErrorList["Quantity must be numeric"],
          0.01
        ),
      },
      { error: ErrorList["Sales invoice ID is required"] }
    ),
    { error: ErrorList["Sales return items required"] }
  ),
});

/**
 * Parameter `:id` pada GET /:id dan DELETE /:id.
 *
 * Keduanya memakai rantai yang sama persis, jadi satu skema dipakai bersama.
 * Batas bawahnya 1, berbeda dari faktur penjualan yang memakai 0.
 *
 * Nilai pada req.params selalu teks, sehingga dipakai varian yang menerima
 * teks — kebijakan ketat hanya berlaku pada req.body.
 */
export const paramSalesReturnSchema = z.object({
  id: requiredIntFromText(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    1
  ),
});

export type ArchiveSalesReturn = z.infer<typeof archiveSalesReturnSchema>;
export type CreateSalesReturn = z.infer<typeof createSalesReturnSchema>;
export type ParamSalesReturn = z.infer<typeof paramSalesReturnSchema>;
