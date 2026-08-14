import { z } from "zod";
import ErrorList from "../constants/error_list";
import { intFromText } from "./common.schema";

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
/* Perusahaan                                                          */
/* ------------------------------------------------------------------ */

/**
 *   company.name    VarChar(50)
 *   company.address Text — tanpa batas praktis
 *
 * Rantai lama hanya memakai exists() pada kedua bidang, jadi teks kosong
 * diterima. Perilaku itu dipertahankan.
 */
const PANJANG_PERUSAHAAN = { name: 50 } as const;

const perusahaanBase = z.object({
  name: adaBolehKosong(ErrorList["Parameter error"]).refine(
    (nilai) =>
      typeof nilai !== "string" || nilai.length <= PANJANG_PERUSAHAAN.name,
    { message: ErrorList["Company name too long"] }
  ),
  address: adaBolehKosong(ErrorList["Parameter error"]),
});

export const createCompanySchema = perusahaanBase;
export const updateCompanySchema = perusahaanBase;

export const paramCompanySchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});
