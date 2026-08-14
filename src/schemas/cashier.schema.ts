import { z } from "zod";
import ErrorList from "../constants/error_list";
import { requiredInt } from "./common.schema";

/**
 * Kontrak API untuk layar kasir.
 *
 * Rutenya kecil — tiga endpoint yang semuanya berputar di sekitar draft bill —
 * tetapi validasinya sebelumnya tersebar sebagai rantai express-validator di
 * dalam berkas route, dengan aturan `id` ditulis dua kali untuk dua endpoint
 * yang berbeda. Menyatukannya di sini membuat perubahan aturan berlaku pada
 * keduanya sekaligus, dan membuat berkas route kembali berisi routing saja.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal. Di sini tiap skema hanya punya satu bidang, jadi urutannya
 * belum menjadi persoalan — tetapi bila kelak `confirmBillSchema`
 * ditambah `items` dan `payment_methods`, bidang `id` harus tetap berada di
 * urutan pertama agar pesan pada badan kosong tidak berubah. Untuk itu pakai
 * `...tagihanBase.shape`, bukan `.extend()`, yang selalu menempelkan kunci
 * baru di belakang.
 */

/**
 * GET /cashier/bill/:otc
 *
 * `otc` adalah kode teks (kolom draft_bill_code.otc bertipe VarChar(6)), bukan
 * angka — jadi tidak ada pemaksaan ke bilangan di sini.
 *
 * Sengaja TIDAK memakai requiredText dari common.schema. requiredText menolak nilai
 * yang hanya berisi spasi, sedangkan notEmpty() milik rantai lama menghitung
 * spasi sebagai isi, sehingga "/bill/%20%20" selama ini diteruskan ke
 * controller. Menolaknya sekarang akan mengubah status balasan untuk
 * permintaan yang selama ini lolos, dan tidak ada untungnya: pencarian dengan
 * kode berisi spasi hanya berakhir 404 dari controller.
 *
 * Panjang maksimum kolom juga tidak diperiksa. Nilai kepanjangan hanya dipakai
 * untuk mencari baris, bukan disimpan, jadi ia berujung 404 dan bukan galat
 * dari MySQL — berbeda dari kolom yang dipakai saat menulis data.
 *
 * Catatan: pemeriksaan ini praktis tidak pernah gagal. Express tidak mencocokkan
 * "/bill/" dengan pola "/bill/:otc", sehingga `otc` yang kosong berakhir 404
 * sebelum validasi berjalan. Aturannya dipertahankan agar perilakunya tetap
 * sama seandainya pola rute kelak diubah.
 */
export const getBillByOtcSchema = z.object({
  otc: z
    .string({ error: ErrorList["Parameter error"] })
    .min(1, ErrorList["Parameter error"]),
});

/**
 * Bidang bersama untuk kedua endpoint yang menunjuk satu draft bill.
 *
 * TIGA PERUBAHAN PERILAKU YANG DISENGAJA, ketiganya menukar galat 500 dengan
 * galat 400:
 *
 * PERTAMA: nilai bukan angka tidak lagi diterima. Rantai lama memakai isInt(),
 * yang mengubah nilai menjadi teks lebih dulu, sehingga `{"id": "12"}` lolos
 * validasi. Nilai teks itu kemudian diteruskan apa adanya ke Prisma, yang
 * mensyaratkan `where: { id: number }` dan melempar galat validasinya sendiri
 * — pengguna menerima "Internal server error". Jadi tidak ada pemanggil yang
 * selama ini berhasil mengirim teks; yang berubah hanyalah galatnya menjadi
 * jelas dan berkode 400.
 *
 * KEDUA: batas bawah 1. isInt() tanpa opsi menerima 0 dan bilangan negatif,
 * padahal kolom id memakai autoincrement mulai dari 1 sehingga nilai seperti
 * itu tidak pernah cocok dengan baris mana pun — deleteByID berakhir 500 dari
 * Prisma, confirmByID berakhir 404.
 *
 * KETIGA: nilai berupa array ditolak. express-validator memperlakukan bidang
 * yang berisi array sebagai KUMPULAN nilai, lalu memeriksa tiap anggotanya.
 * Akibatnya `{"id": []}` — nol anggota — tidak diperiksa sama sekali dan lolos
 * dengan `id` berupa array kosong, sedangkan `{"id": [5]}` lolos karena
 * anggotanya bilangan bulat. Keduanya lalu sampai ke Prisma sebagai array dan
 * berakhir 500. Lubang ini yang paling mudah dipicu tanpa sengaja oleh
 * frontend yang mengirim isi keranjang apa adanya.
 *
 * Kedua pesan pada requiredInt sengaja sama. Rantai lama memasang notEmpty() dan
 * isInt() dengan pesan yang identik, jadi pengguna tidak pernah bisa
 * membedakan "tidak dikirim" dari "salah bentuk", dan menambah pesan baru di
 * sini berarti mengubah kalimat yang dilihat pengguna.
 */
const tagihanBase = z.object({
  id: requiredInt(ErrorList["ID is required"], ErrorList["ID is required"], 1),
});

/** POST /cashier/bill/delete */
export const deleteBillSchema = tagihanBase;

/**
 * POST /cashier/bill/confirm
 *
 * Diberi nama sendiri meskipun isinya sama persis dengan skema hapus. Keduanya
 * kebetulan seragam sekarang, bukan karena aturannya memang harus sama:
 * konfirmasi juga membaca `items`, `payment_methods`, `service`, `delivery`,
 * dan `discount` dari badan permintaan. Kalau kelak bidang-bidang itu ikut
 * divalidasi, penambahannya tidak boleh diam-diam ikut berlaku pada endpoint
 * hapus.
 *
 * Bidang-bidang tersebut memang BELUM divalidasi di sini — rantai lama pun
 * tidak memeriksanya, dan menambahkannya sekarang berarti memunculkan pesan
 * galat baru yang belum pernah dilihat frontend. Akibatnya masih ada:
 * `items.forEach` di controller melempar TypeError bila `items` tidak dikirim,
 * dan pengguna menerima 500. Perbaikannya perlu dibahas bersama frontend.
 *
 * Bidang `userId` juga tidak divalidasi. Nilainya ditulis authMiddleware ke
 * req.body, bukan dikirim klien.
 */
export const confirmBillSchema = z.object({
  ...tagihanBase.shape,
});

export type GetBillByOtc = z.infer<typeof getBillByOtcSchema>;
export type DeleteBill = z.infer<typeof deleteBillSchema>;
export type ConfirmBill = z.infer<typeof confirmBillSchema>;
