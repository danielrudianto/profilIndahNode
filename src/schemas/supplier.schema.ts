import { z } from "zod";
import ErrorList from "../constants/error_list";
import { intDariTeks, teksWajib } from "./common.schema";

/**
 * Kontrak API untuk domain supplier.
 *
 * Berkas ini mendefinisikan bentuk data yang MASUK dan KELUAR lewat HTTP.
 * Ia bukan definisi tabel — struktur basis data tetap berada di
 * prisma/schema.prisma. Keduanya sengaja dipisah: kontrak API boleh lebih
 * ketat daripada basis data (misalnya `address` boleh NULL di tabel tetapi
 * diwajibkan saat membuat supplier), dan boleh menyembunyikan kolom yang tidak
 * perlu diketahui klien.
 *
 * Susunannya mengikuti empat lapis:
 *
 *   Base      bidang bersama, ditulis sekali
 *   Create    untuk POST — Base apa adanya
 *   Update    semua bidang opsional, untuk perubahan sebagian
 *   Response  bentuk balasan — Base ditambah id dan jejak audit
 *
 * Lapis Base itu yang membuat aturan tidak perlu ditulis ulang. Sebelum
 * disusun begini, aturan `name` muncul terpisah di skema buat dan skema ubah;
 * mengubah salah satunya saja akan membuat keduanya diam-diam berbeda.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan.
 */

/**
 * Batas panjang diambil dari lebar kolom di prisma/schema.prisma.
 * Disimpan sebagai konstanta bernama supaya keterkaitannya dengan basis data
 * terlihat, dan supaya satu tempat saja yang perlu diubah bila kolomnya
 * diperlebar.
 *
 *   supplier.name    VarChar(100)
 *   supplier.npwp    VarChar(45)
 *   supplier.address Text — tanpa batas praktis, jadi tidak dibatasi di sini
 */
const PANJANG = {
  name: 100,
  npwp: 45,
} as const;

/** Bidang yang dimiliki bersama oleh permintaan dan balasan. */
const supplierBase = z.object({
  name: teksWajib(ErrorList["Name required"]).max(
    PANJANG.name,
    ErrorList["Supplier name too long"]
  ),
  address: teksWajib(ErrorList["Address required"]),
});

/** POST /supplier */
export const buatSupplierSchema = supplierBase;

/**
 * PUT /supplier
 *
 * `id` diperiksa hanya keberadaannya, tanpa pemeriksaan bilangan — meniru
 * rantai lama yang memakai .not().isEmpty() saja. Mengetatkannya akan mengubah
 * pesan yang dilihat pengguna, jadi dibiarkan dan dibahas terpisah.
 */
export const ubahSupplierSchema = z.object({
  // Bentuk objek dirakit dengan menyebar `shape`, bukan dengan .extend().
  // .extend() menambahkan kunci baru di BELAKANG kunci yang sudah ada,
  // sehingga `id` berpindah ke urutan ketiga dan pesan pertama yang muncul
  // pada badan kosong berubah dari "ID tidak boleh kosong" menjadi "Nama tidak
  // boleh kosong". Urutan di sini harus tetap id, name, address seperti rantai
  // validator yang digantikan.
  id: z
    .any()
    .refine(
      (nilai) => nilai !== undefined && nilai !== null && String(nilai) !== "",
      { message: ErrorList["ID is required"] }
    ),
  ...supplierBase.shape,
  npwp: z
    .string()
    .max(PANJANG.npwp, ErrorList["Supplier NPWP too long"])
    .optional(),
});

/** GET /supplier/:id */
export const ambilSupplierSchema = z.object({
  id: intDariTeks(ErrorList["Parameter error"]),
});

/**
 * DELETE /supplier/:id
 *
 * Catatan perubahan perilaku: rantai lama memakai isInt() tanpa batas bawah
 * pada rute ini, sehingga id negatif seperti -1 diterima dan diteruskan ke
 * controller. Rute GET /:id pada berkas yang sama memakai isInt({ min: 0 })
 * dan menolaknya. Skema ini menyamakan keduanya pada perilaku yang lebih
 * ketat. Id negatif tidak pernah cocok dengan baris mana pun karena kolom id
 * memakai autoincrement mulai dari 1.
 */
export const hapusSupplierSchema = z.object({
  id: intDariTeks(ErrorList["Parameter error"]),
});

/**
 * Bentuk balasan.
 *
 * Belum dipakai untuk memvalidasi keluaran — controller masih mengirim objek
 * apa adanya. Nilainya sekarang ada pada tipe `Supplier` di bawah, yang bisa
 * dipakai controller sebagai ganti `any`.
 */
export const supplierResponseSchema = supplierBase.extend({
  id: z.number().int().min(1),
  npwp: z.string().nullable().optional(),
  created_by: z.number().int().nullable().optional(),
  created_at: z.date().nullable().optional(),
  updated_by: z.number().int().nullable().optional(),
  updated_at: z.date().nullable().optional(),
});

export type BuatSupplier = z.infer<typeof buatSupplierSchema>;
export type UbahSupplier = z.infer<typeof ubahSupplierSchema>;
export type Supplier = z.infer<typeof supplierResponseSchema>;
