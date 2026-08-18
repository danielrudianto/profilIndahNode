import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { intFromText, requiredText } from "./common.schema";

/**
 * Kontrak API untuk domain pengguna.
 *
 * URUTAN BIDANG PENTING. Balasan galat hanya memuat pesan PERTAMA yang gagal,
 * jadi urutan di sini menyalin urutan rantai validator yang digantikan:
 * pada POST role lebih dulu, lalu name, username, nik; pada PUT `id`
 * disisipkan paling depan.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA — pesan bawaan express-validator.
 *
 * Rantai lama menulis dua aturan berurutan pada satu bidang tetapi hanya
 * memasang `.withMessage()` pada aturan KEDUA:
 *
 *   body("role").notEmpty().isNumeric().withMessage(ErrorList["User role required"])
 *   body("id").notEmpty().isNumeric().withMessage(ErrorList["ID is required"])
 *
 * Di express-validator `.withMessage()` hanya berlaku untuk validator tepat
 * sebelumnya, sehingga `notEmpty()` di kedua baris itu tidak punya pesan sama
 * sekali dan memakai bawaannya: teks "Invalid value". Karena rantai TIDAK
 * berhenti pada kegagalan pertama, badan tanpa `role` menghasilkan dua galat
 * dan yang terkirim ke klien adalah yang pertama — "Invalid value".
 *
 * Akibatnya kasus paling umum di endpoint ini, yaitu bidang yang tidak dikirim
 * sama sekali, membalas kalimat berbahasa Inggris yang tidak ada di ErrorList.
 * Sejak ErrorList berisi key i18n, balasan itu menjadi satu-satunya yang tidak
 * bisa diterjemahkan frontend. Skema ini memakai key yang semestinya.
 * Statusnya tetap 400; hanya isi badannya yang berubah.
 */

/**
 * Bidang yang dimiliki bersama oleh POST dan PUT.
 *
 * `role` sengaja TIDAK memakai .int(). Rantai lama memakai isNumeric(), yang
 * meloloskan pecahan maupun bilangan negatif ("1.5" dan "-1" keduanya lolos),
 * dan mengetatkannya di sini berarti menolak permintaan yang selama ini
 * diterima — perubahan yang perlu diputuskan terpisah, bukan diselipkan dalam
 * migrasi. Yang berubah hanyalah penolakan terhadap ANGKA BERUPA TEKS, sesuai
 * kebijakan ketat di common.schema.ts.
 *
 * `nik` memakai requiredText walaupun rantai lama hanya notEmpty(). Kolomnya
 * bertipe String di prisma/schema.prisma, jadi nik berupa angka bukan sekadar
 * bentuk yang longgar — nilainya diteruskan apa adanya ke repository dan
 * ditolak Prisma jauh di belakang lapisan validasi.
 */
const penggunaBase = z.object({
  role: z.number({ error: ErrorList["User role required"] }),
  name: requiredText(ErrorList["Name required"]),
  username: requiredText(ErrorList["Username is required"]),
  nik: requiredText(ErrorList["Parameter error"]),
});

/** POST /user */
export const createUserSchema = penggunaBase;

/**
 * PUT /user
 *
 * Bentuk objek dirakit dengan menyebar `shape`, bukan dengan .extend().
 * .extend() menempatkan kunci baru di BELAKANG kunci yang sudah ada, sehingga
 * `id` berpindah ke urutan kelima dan pesan pertama pada badan kosong berubah
 * dari pesan id menjadi pesan role. Urutan harus tetap id, role, name,
 * username, nik seperti rantai yang digantikan.
 */
export const updateUserSchema = z.object({
  id: z.number({ error: ErrorList["ID is required"] }),
  ...penggunaBase.shape,
});

/**
 * Parameter jalur `:id` pada GET /user/:id dan DELETE /user/:id.
 *
 * Memakai intFromText karena nilai pada req.params selalu berupa teks; di sana
 * tidak ada tipe asli yang bisa dipertahankan, jadi kebijakan ketat req.body
 * tidak berlaku. Batas bawah 0 mengikuti isInt({ min: 0 }) pada rantai lama.
 */
export const paramUserSchema = z.object({
  id: intFromText(ErrorList["Parameter error"]),
});

/**
 * POST /user/changePassword
 *
 * `userId` tidak ikut divalidasi: nilainya ditulis authMiddleware ke req.body,
 * bukan dikirim klien.
 */
/*
  Aturan BARU, bukan migrasi: ganti sandi kini mensyaratkan sandi lama.
  Rantai lama membiarkan siapa pun di depan komputer yang kebuka
  mengganti sandi pemiliknya tanpa membuktikan tahu sandi sebelumnya.
*/
export const updateUserPasswordSchema = z.object({
  /* password lebih dulu: badan kosong tetap berpesan sama dengan rantai lama. */
  password: requiredText(ErrorList["Password is required"]),
  currentPassword: requiredText(ErrorList["Current password required"]),
});

export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
