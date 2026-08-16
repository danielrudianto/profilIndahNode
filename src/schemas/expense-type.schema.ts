import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredText } from "./common.schema";

/**
 * Kontrak API untuk merek produk, tipe produk, dan tipe pengeluaran.
 *
 * Ketiganya bentuknya paling sederhana di antara data master, tetapi rantai
 * validasinya justru paling tidak seragam. Perbedaan yang ditiru apa adanya:
 *
 *   product_brand   param id memakai exists() lalu isInt
 *   product_type    param id memakai isNumeric() lalu isInt
 *   expense_type    param id memakai isNumeric(), tetapi pesannya berbeda:
 *                   "ID is required" lalu "ID must be integer"
 *
 * isNumeric() dan exists() tidak setara. isNumeric() menolak "abc" tetapi
 * menerima "1.5"; pemeriksaan isInt sesudahnya yang menyaring pecahan. Karena
 * pesan keduanya sama pada dua berkas pertama, perbedaan itu tidak terlihat
 * dari luar — tetapi pada expense_type pesannya berbeda, sehingga urutan
 * pemeriksaan menentukan kalimat yang dilihat pengguna.
 *
 * Batas panjang mengikuti lebar kolom di prisma/schema.prisma:
 *   product_brand.name  VarChar(45)
 *   product_type.name   VarChar(45)
 *   expense_type.name   VarChar(100)
 *   expense_type.description  Text — tanpa batas praktis
 */

const PANJANG = {
  merek: 45,
  tipeProduk: 45,
  tipePengeluaran: 100,
} as const;

/* ------------------------------------------------------------------ */
/* Tipe pengeluaran                                                    */
/* ------------------------------------------------------------------ */

const tipePengeluaranBase = z.object({
  name: requiredText(ErrorList["Expense type name is required"]).max(
    PANJANG.tipePengeluaran,
    ErrorList["Expense type name too long"]
  ),
  description: requiredText(ErrorList["Expense type description is required"]),
});

/**
 * POST /expense-type — selalu membuat ANAK, jadi parent_id wajib.
 * Keabsahan induknya (hidup dan benar-benar baku) diperiksa controller;
 * skema hanya menjaga bentuknya.
 */
export const createExpenseTypeSchema = z.object({
  ...tipePengeluaranBase.shape,
  parent_id: z
    .any()
    .refine((nilai) => nilai !== undefined && !isNaN(Number(nilai)), {
      message: ErrorList["Expense type parent invalid"],
    })
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["Expense type parent invalid"],
    }),
});

/** PUT /expense-type — urutan lama: name, description, lalu id. */
export const updateExpenseTypeSchema = z.object({
  ...tipePengeluaranBase.shape,
  id: z
    .any()
    .refine((nilai) => nilai !== undefined && !isNaN(Number(nilai)), {
      message: ErrorList["ID is required"],
    })
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["ID must be integer"],
    }),
});

/**
 * Parameter jalur pada expense-type memakai pesan yang berbeda dari domain
 * lain: "ID is required" untuk nilai yang bukan angka, lalu "ID must be
 * integer" untuk pecahan atau nilai di bawah 1.
 */
export const paramExpenseTypeSchema = z.object({
  id: z
    .any()
    .refine((nilai) => nilai !== undefined && !isNaN(Number(nilai)), {
      message: ErrorList["ID is required"],
    })
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["ID must be integer"],
    }),
});
