import { z } from "zod";
import ErrorList from "../constants/error_list";
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

/**
 * PUT /auth/password
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA.
 *
 * Rantai lama menulis `body("password").not().isEmpty()` tanpa
 * `.withMessage()`, sehingga express-validator memakai pesan bawaannya dan
 * endpoint ini membalas 400 dengan badan berisi teks `Invalid value` —
 * kalimat berbahasa Inggris yang tidak berasal dari ErrorList sama sekali.
 *
 * Sejak nilai ErrorList berubah menjadi key i18n, cacat itu makin terasa:
 * frontend akan menerima `Invalid value` yang bukan key dan tidak bisa
 * diterjemahkan. Karena itu di sini dipakai key yang semestinya.
 *
 * Bidang `userId` tidak ikut divalidasi. Nilainya ditulis authMiddleware ke
 * req.body, bukan dikirim klien; memvalidasinya berarti memperlakukan
 * identitas pemanggil seolah masukan pengguna.
 */
export const updatePasswordSchema = z.object({
  password: requiredText(ErrorList["Password is required"]),
});

export type Login = z.infer<typeof loginSchema>;
export type UpdatePassword = z.infer<typeof updatePasswordSchema>;
