import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredText } from "./common.schema";

/**
 * Kontrak API untuk domain autentikasi.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan:
 * username lebih dulu, baru password.
 *
 * Skema di sini sengaja TIDAK memeriksa panjang minimum sandi. Rantai lama
 * hanya memeriksa bahwa nilainya tidak kosong, dan menambahkan aturan baru
 * akan menolak sandi lama yang selama ini diterima — pengguna yang sudah
 * terdaftar bisa mendadak tidak bisa masuk. Kalau aturan sandi mau
 * diperketat, itu keputusan terpisah yang perlu disertai jalur pembaruan
 * sandi bagi pengguna lama.
 */

/** POST /auth/login */
export const loginSchema = z.object({
  username: requiredText(ErrorList["Username is required"]),
  password: requiredText(ErrorList["Password is required"]),
});

/*
  PUT /auth/password dan PUT /auth/reset-password sudah DIBUANG beserta
  skemanya. Keduanya mengganti sandi pemilik token tanpa membuktikan sandi
  lama — sesi yang tercuri cukup untuk merebut akun, dan varian reset-nya
  bahkan membuatkan sandi acak tanpa validasi apa pun. Penggantinya:
  POST /user/changePassword (wajib sandi lama) dan reset oleh administrator
  di PUT /user/:id/reset-password.
*/

export type Login = z.infer<typeof loginSchema>;
