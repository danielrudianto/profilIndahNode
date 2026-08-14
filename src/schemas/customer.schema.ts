import { z } from "zod";
import ErrorList from "../constants/error_list";
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
/* Pelanggan                                                           */
/* ------------------------------------------------------------------ */

/**
 *   customer.name         VarChar(100)
 *   customer.pic          VarChar(100)
 *   customer.phone_number VarChar(45)
 *   customer.address      VarChar(191)
 *   customer.npwp         VarChar(45), boleh NULL
 */
const PANJANG_PELANGGAN = {
  name: 100,
  pic: 100,
  phone_number: 45,
  address: 191,
  npwp: 45,
} as const;

/** Urutan mengikuti customerBody: name, pic, phone_number, address, npwp. */
const pelangganBase = z.object({
  name: requiredText(ErrorList["Customer name is required"]).max(
    PANJANG_PELANGGAN.name,
    ErrorList["Customer name too long"]
  ),
  pic: requiredText(ErrorList["Customer PIC is required"]).max(
    PANJANG_PELANGGAN.pic,
    ErrorList["Customer PIC too long"]
  ),
  phone_number: adaBolehKosong(ErrorList["Customer phone number is required"]),
  address: requiredText(ErrorList["Customer address is required"]).max(
    PANJANG_PELANGGAN.address,
    ErrorList["Customer address too long"]
  ),
  npwp: adaBolehKosong(ErrorList["Customer NPWP is required"]),
});

/** POST /customer */
export const createCustomerSchema = pelangganBase;

/**
 * PUT /customer
 *
 * Urutan bidang di berkas route menempatkan id LEBIH DULU, baru menyebar
 * customerBody. Urutan itu menentukan pesan mana yang muncul pada badan yang
 * kosong, jadi harus ditiru persis.
 */
export const updateCustomerSchema = z.object({
  id: z
    .any()
    .refine(
      (nilai) => nilai !== undefined && nilai !== null && String(nilai) !== "",
      { message: ErrorList["Customer ID is required"] }
    )
    .refine((nilai) => Number.isInteger(Number(nilai)) && Number(nilai) >= 1, {
      // Kunci ErrorList ini memang tertulis "CUstomer" dengan huruf U besar.
      // Salah ketik tersebut dibiarkan agar kunci tetap cocok; memperbaikinya
      // harus dilakukan bersamaan di error_list.ts dan seluruh pemakaiannya.
      message: ErrorList["CUstomer ID must be integer"],
    }),
  ...pelangganBase.shape,
});

export const paramCustomerSchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});
