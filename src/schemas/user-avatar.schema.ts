import { z } from "zod";
import ErrorList from "../constants/error_list";
import { int } from "./common.schema";

/**
 * Kontrak API untuk avatar pengguna.
 *
 * Seluruh bidang memakai pesan yang sama, ErrorList["Parameter error"], persis
 * seperti rantai validator yang digantikan. Karena pesannya seragam, urutan
 * bidang tidak mengubah kalimat yang dilihat pengguna — tetapi urutannya tetap
 * disalin apa adanya (accessories, top, clothes, color, eyes, eyebrows, mouth,
 * circle) supaya perbandingan dengan rantai lama tetap lurus bila kelak salah
 * satu pesannya dibedakan.
 *
 * Semua bidang WAJIB. Rantai lama pun begitu: isInt(), isHexColor(), dan
 * isBoolean() dijalankan terhadap nilai undefined yang lebih dulu diubah
 * menjadi teks kosong, dan teks kosong gagal di ketiganya.
 */

/**
 * Pola yang dipakai validator.js untuk isHexColor().
 *
 * Ditulis ulang di sini, bukan diambil dari common.schema.ts, karena hanya
 * domain ini yang memakainya — memindahkannya ke helper bersama akan menaruh
 * aturan milik satu endpoint di berkas yang dibaca semua domain.
 *
 * Perhatikan tiga kelonggaran yang SENGAJA dipertahankan supaya nilai yang
 * selama ini tersimpan tetap diterima:
 *
 *   tanda pagar opsional        "fff" sama sahnya dengan "#fff"
 *   panjang 3, 4, 6, atau 8     bentuk 4 dan 8 membawa kanal alfa
 *   huruf besar maupun kecil    "#FFF" dan "#fff" sama-sama sah
 */
const POLA_HEKS = /^#?([0-9A-F]{3}|[0-9A-F]{4}|[0-9A-F]{6}|[0-9A-F]{8})$/i;

/**
 * POST /user-avatar
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA, mengikuti kebijakan ketat req.body di
 * src/schemas/common.schema.ts. Rantai lama mengubah tiap nilai menjadi teks
 * sebelum memeriksanya, sehingga tiga bentuk masukan yang salah ikut lolos:
 *
 *   { accessories: "1" }   isInt("1") lolos — angka dikirim sebagai teks
 *   { color: 123 }         isHexColor("123") lolos, karena "123" memang tiga
 *                          digit heksadesimal yang sah. Angka apa pun yang
 *                          kebetulan berbentuk demikian tersimpan sebagai warna.
 *   { circle: 1 }          isBoolean("1") lolos; begitu pula "true" dan "0"
 *
 * Ketiganya bukan berhenti di lapisan validasi: nilainya diteruskan apa adanya
 * ke user-avatar.repository dan baru ditolak Prisma sebagai galat 500, atau —
 * pada kasus color — tersimpan diam-diam sebagai warna yang tidak dimaksudkan.
 * JSON sudah membawa tipe aslinya, jadi menerima teks hanya menyembunyikan
 * cacat di sisi pemanggil.
 *
 * `userId` tidak ikut divalidasi: nilainya ditulis authMiddleware ke req.body,
 * bukan dikirim klien.
 */
export const updateAvatarSchema = z.object({
  accessories: int(ErrorList["Parameter error"]),
  top: int(ErrorList["Parameter error"]),
  clothes: int(ErrorList["Parameter error"]),
  color: z
    .string({ error: ErrorList["Parameter error"] })
    .regex(POLA_HEKS, ErrorList["Parameter error"]),
  eyes: int(ErrorList["Parameter error"]),
  eyebrows: int(ErrorList["Parameter error"]),
  mouth: int(ErrorList["Parameter error"]),
  circle: z.boolean({ error: ErrorList["Parameter error"] }),
});

export type UpdateAvatar = z.infer<typeof updateAvatarSchema>;
