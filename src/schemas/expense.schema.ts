import { z } from "zod";
import ErrorList from "../constants/error_list";
import { required } from "./common.schema";

/**
 * Kontrak API untuk produk dan pengeluaran.
 *
 * Dua catatan penting tentang cara rantai lama bekerja, karena keduanya mudah
 * salah ditiru.
 *
 * PERTAMA: isNumeric() menerima teks. Pada express-validator, isNumeric()
 * berlaku pada nilai yang sudah diubah menjadi teks, sehingga "5" lolos dan
 * 5 juga lolos. Skema di sini karenanya tidak memakai z.number(), yang akan
 * menolak "5" dan diam-diam menolak permintaan yang selama ini diterima.
 *
 * KEDUA: isNumeric() juga menerima pecahan. Hanya isInt() yang menyaringnya.
 * Bidang yang rantai lamanya hanya memakai isNumeric() tetap menerima 1.5 di
 * sini.
 */

/** Angka dalam bentuk apa pun — meniru isNumeric(), pecahan diterima. */
const angka = (pesan: string) =>
  z
    .any()
    .refine(
      (nilai) =>
        nilai !== undefined &&
        nilai !== null &&
        String(nilai).trim() !== "" &&
        !isNaN(Number(nilai)),
      { message: pesan }
    );

/** Bilangan bulat minimal 1 — meniru isInt({ min: 1 }). */
const bulatMin1 = (pesan: string) =>
  z
    .any()
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: pesan,
    });
/* ================================================================== */
/* Pengeluaran                                                         */
/* ================================================================== */

/** Urutan mengikuti expenseBody pada berkas route. */
const pengeluaranBase = z.object({
  date: required(ErrorList["Parameter error"]),
  description: required(ErrorList["Parameter error"]),
  value: angka(ErrorList["Parameter error"]),
  company_id: angka(ErrorList["Parameter error"]),
  expense_type_id: required(ErrorList["Parameter error"]),
});

/** POST /expense */
export const createExpenseSchema = pengeluaranBase;

/** PUT /expense — urutan lama: expenseBody dulu, baru id. */
export const updateExpenseSchema = z.object({
  ...pengeluaranBase.shape,
  id: angka(ErrorList["Parameter error"]),
});

/** DELETE /expense/:id */
export const paramExpenseSchema = z.object({
  id: angka(ErrorList["Parameter error"]),
});

/**
 * GET /expense
 *
 * Bulan dibatasi 0-12 pada rute ini, sedangkan /expense/mutation di bawah
 * hanya memastikan nilainya angka. Perbedaan itu ada di rantai lama dan
 * dipertahankan: menyamakannya akan menolak permintaan yang selama ini
 * diterima pada salah satu rute.
 */
export const queryExpenseSchema = z.object({
  month: required(ErrorList["Month is required"]).refine(
    (nilai) =>
      Number.isInteger(Number(nilai)) &&
      Number(nilai) >= 0 &&
      Number(nilai) <= 12,
    { message: ErrorList["Month must be numeric"] }
  ),
  year: required(ErrorList["Year is required"]).refine(
    (nilai) => !isNaN(Number(nilai)),
    { message: ErrorList["Year must be numeric"] }
  ),
});

/** GET /expense/mutation — bulan hanya diperiksa berupa angka. */
export const queryExpenseMutationSchema = z.object({
  month: required(ErrorList["Month is required"]).refine(
    (nilai) => !isNaN(Number(nilai)),
    { message: ErrorList["Month must be numeric"] }
  ),
  year: required(ErrorList["Year is required"]).refine(
    (nilai) => !isNaN(Number(nilai)),
    { message: ErrorList["Year must be numeric"] }
  ),
});
