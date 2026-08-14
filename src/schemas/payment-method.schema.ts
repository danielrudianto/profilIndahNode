import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { intFromText, requiredText } from "./common.schema";

/**
 * Kontrak API untuk data master: pelanggan, perusahaan, dan metode pembayaran.
 *
 * Ketiganya digabung dalam satu berkas karena bentuknya serupa dan masing-
 * masing kecil. Bila salah satunya kelak tumbuh, ia dipisah ke berkasnya
 * sendiri.
 *
 * DUA ATURAN YANG MIRIP TAPI BERBEDA.
 *
 * Rantai lama memakai dua bentuk pemeriksaan yang mudah tertukar:
 *
 *   .exists()          bidang harus ADA. Teks kosong "" tetap lolos.
 *   .notEmpty()        bidang harus ada DAN tidak kosong.
 *
 * Perbedaannya nyata: customer.phone_number dan customer.npwp memakai
 * exists(), sedangkan customer.name memakai notEmpty(). Menyamakannya akan
 * menolak pelanggan yang memang tidak punya NPWP — data yang selama ini sah.
 *
 * Batas panjang diambil dari lebar kolom di prisma/schema.prisma. Sebelumnya
 * tidak ada pemeriksaan panjang sama sekali, sehingga nilai yang terlalu
 * panjang lolos validasi lalu ditolak MySQL, dan pengguna menerima
 * "Internal server error".
 */

/** Bidang yang harus ada tetapi boleh berisi teks kosong — meniru exists(). */
const adaBolehKosong = (pesan: string) =>
  z.any().refine((nilai) => nilai !== undefined, { message: pesan });

/* ------------------------------------------------------------------ */
/* Metode pembayaran                                                   */
/* ------------------------------------------------------------------ */

/**
 *   payment_method.name        VarChar(100)
 *   payment_method.description Text — tanpa batas praktis
 */
const PANJANG_METODE = { name: 100 } as const;

const metodeBase = z.object({
  name: requiredText(ErrorList["Parameter error"]).max(
    PANJANG_METODE.name,
    ErrorList["Payment method name too long"]
  ),
  description: requiredText(ErrorList["Parameter error"]),
});

export const createPaymentMethodSchema = metodeBase;

/** PUT /payment-method — urutan lama: id, name, description. */
export const updatePaymentMethodSchema = z.object({
  id: z
    .any()
    .refine(
      (nilai) => nilai !== undefined && nilai !== null && String(nilai) !== "",
      { message: ErrorList["Parameter error"] }
    )
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["Parameter error"],
    }),
  ...metodeBase.shape,
});

export const paramPaymentMethodSchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});

/**
 * DELETE /payment-method/:id memakai pesan yang berbeda dari rute lain pada
 * berkas yang sama: "ID is required" lalu "ID must be numeric", bukan
 * "Parameter error". Perbedaan itu dipertahankan.
 */
export const deletePaymentMethodSchema = z.object({
  id: z
    .any()
    .refine((nilai) => nilai !== undefined && String(nilai) !== "", {
      message: ErrorList["ID is required"],
    })
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      message: ErrorList["ID must be numeric"],
    }),
});
