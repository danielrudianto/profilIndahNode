import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { present, requiredInt, required } from "./common.schema";

/**
 * Kontrak API untuk domain draft bill.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutan kunci di tiap skema mengikuti urutan rantai
 * validator yang digantikan — bukan urutan yang paling enak dibaca.
 *
 * LUBANG ARRAY PADA RANTAI LAMA.
 *
 * Semua pemeriksaan bawaan express-validator (notEmpty, isInt, dan kawan-kawan)
 * dijalankan lewat StandardValidation, yang isinya kira-kira begini:
 *
 *   const values = Array.isArray(value) ? value : [value];
 *   values.forEach(...)
 *
 * Artinya bidang yang berisi array tidak diperiksa sebagai satu nilai,
 * melainkan sebagai KUMPULAN nilai. Untuk array kosong jumlah anggotanya nol,
 * sehingga perulangannya tidak berjalan sekali pun dan bidang itu lolos TANPA
 * DIPERIKSA SAMA SEKALI. `{"id": []}` dan `{"payment_methods": []}` selama ini
 * membalas 200 justru karena tidak ada yang memeriksanya.
 *
 * Skema di bawah menutup lubang itu. Lihat catatan per-skema untuk daftar
 * lengkap perubahan perilakunya; semuanya diuji berpasangan di
 * tests/draft-bill.schema.test.ts.
 *
 * Pengecualiannya adalah `exists()`, yang bukan pemeriksaan bawaan melainkan
 * custom validator. Custom validator menerima nilai aslinya utuh, jadi array
 * kosong pun tetap diperiksa di sana — lihat createDraftBillSchema.
 */

/**
 * Aturan `id` untuk kedua endpoint yang menunjuk satu draft bill.
 *
 * TIGA PERUBAHAN PERILAKU YANG DISENGAJA, ketiganya menukar 500 dengan 400:
 *
 * PERTAMA: nilai bukan angka ditolak. Rantai lama hanya memasang notEmpty(),
 * yang bekerja pada bentuk TEKS nilainya — sehingga "5", "abc", dan {} sama-sama
 * lolos. Semuanya lalu diteruskan apa adanya ke `fetchByID` dan `deleteByID`,
 * yang mensyaratkan `where: { id: number }`; Prisma melempar galat validasinya
 * sendiri dan pengguna menerima "Internal server error". Jadi tidak ada
 * pemanggil yang selama ini berhasil mengirim teks — yang berubah hanyalah
 * galatnya menjadi jelas dan berkode 400. Ini persis kebijakan ketat pada
 * req.body: JSON sudah membawa tipe aslinya, jadi menerima "5" hanya
 * menyembunyikan cacat di sisi pemanggil.
 *
 * KEDUA: batas bawah 1 dan keharusan bilangan bulat. notEmpty() tidak
 * membatasi apa pun, padahal kolom id memakai autoincrement mulai dari 1
 * sehingga 0, -1, dan 3.5 tidak pernah cocok dengan baris mana pun.
 *
 * KETIGA: array ditolak. Lihat catatan lubang array di atas berkas ini.
 *
 * Kedua pesan pada requiredInt sengaja SAMA. Rantai lama hanya punya satu pesan
 * untuk bidang ini, jadi pengguna tidak pernah bisa membedakan "tidak dikirim"
 * dari "salah bentuk"; menambah pesan baru di sini berarti mengubah kalimat
 * yang dilihat pengguna.
 *
 * Catatan keterkaitan: aturan yang sama sudah ada di cashier.schema.ts, karena
 * POST /cashier/bill/delete dan POST /cashier/bill/confirm memanggil controller
 * draft bill yang sama persis. Keduanya sengaja TIDAK disatukan — dulu pun
 * rantainya berbeda (cashier memasang isInt(), draft-bill tidak), dan
 * menyatukannya sekarang berarti satu perubahan aturan diam-diam ikut berlaku
 * pada rute milik layar lain. Penyatuannya keputusan terpisah.
 */
const draftBillIdBase = z.object({
  id: requiredInt(ErrorList["ID is required"], ErrorList["ID is required"], 1),
});

/** POST /draft-bill/delete */
export const deleteDraftBillSchema = draftBillIdBase;

/**
 * POST /draft-bill/confirm
 *
 * `payment_methods` dulu diperiksa dua kali dengan pesan yang identik:
 * notEmpty() lalu isArray(). Karena pesannya sama, urutan di antara keduanya
 * tidak pernah terlihat pengguna, dan di sini cukup satu skema array.
 *
 *   z.array(...)  menggantikan isArray()
 *   required      menggantikan notEmpty() yang dijalankan per ANGGOTA array
 *   .min(1, ...)  menutup lubang array kosong
 *
 * Anggota array sengaja diperiksa dengan required dan bukan dengan z.object({...}).
 * Rantai lama tidak pernah menyentuh isi tiap metode pembayaran — tidak ada
 * `body("payment_methods.*.id")` — jadi mendefinisikan bentuknya di sini berarti
 * memunculkan pesan galat baru yang belum pernah dilihat frontend. Bentuk
 * anggotanya perlu dibahas dengan sisi klien lebih dulu.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA: `payment_methods: []` dulu 200 dan sampai
 * ke repository sebagai daftar pembayaran kosong, sehingga tagihan tercatat
 * terkonfirmasi tanpa satu pun pembayaran. Sekarang 400.
 *
 * `service`, `delivery`, dan `discount` menjadi z.number(). Rantai lama hanya
 * memasang notEmpty(), yang meloloskan "1500" dan bahkan {} ("[object Object]"
 * bukan teks kosong). Ketiganya nominal uang yang diteruskan ke kolom desimal,
 * jadi nilai bukan angka tidak pernah bisa berakhir baik. Sengaja TIDAK dipakai
 * requiredInt: pecahan seperti 1500.5 sah untuk nominal, dan nilai negatif selama
 * ini diterima — mengetatkan keduanya adalah aturan baru, bukan pemindahan
 * aturan lama.
 *
 * `items` tidak divalidasi di sini, sama seperti rantai lama. Akibatnya masih
 * ada: `items.forEach` di controller melempar TypeError bila `items` tidak
 * dikirim, dan pengguna menerima 500. Menambahkannya sekarang berarti memunculkan
 * pesan galat baru; perbaikannya perlu dibahas bersama frontend.
 *
 * `userId` juga tidak divalidasi — nilainya ditulis authMiddleware ke req.body,
 * bukan dikirim klien.
 */
export const confirmDraftBillSchema = z.object({
  payment_methods: z
    .array(required(ErrorList["Payment method required"]), {
      error: ErrorList["Payment method required"],
    })
    .min(1, ErrorList["Payment method required"]),
  service: z.number({ error: ErrorList["Service required"] }),
  delivery: z.number({ error: ErrorList["Delivery required"] }),
  discount: z.number({ error: ErrorList["Discount required"] }),
  // Bentuk objek dirakit dengan menyebar `shape`, bukan dengan .extend().
  // Di sini keduanya kebetulan menghasilkan urutan yang sama karena `id` memang
  // bidang terakhir pada rantai lama, tetapi menyebar `shape` membuat posisinya
  // ditentukan di tempat ini dan bukan oleh perilaku .extend() yang selalu
  // menempelkan kunci baru di belakang.
  ...draftBillIdBase.shape,
});

/**
 * Pesan untuk POST /draft-bill.
 *
 * CACAT KODE LAMA YANG SENGAJA DIPERTAHANKAN: kelima kalimat ini ditulis
 * langsung di berkas route sebagai teks bahasa Inggris, bukan diambil dari
 * ErrorList. Sejak ErrorList berisi key i18n, kelimanya menjadi satu-satunya
 * balasan galat pada domain ini yang tidak bisa diterjemahkan frontend.
 *
 * Kalimatnya TIDAK diubah di sini. Frontend menampilkan badan balasan apa
 * adanya, jadi menggantinya dengan key i18n akan mengubah teks di layar
 * pengguna — perbaikan tersendiri yang harus naik bersama sisi klien, sama
 * seperti peralihan ErrorList ke key i18n. Yang berubah hanyalah tempatnya:
 * dari tersebar di berkas route menjadi terkumpul di sini.
 */
const PESAN_BUAT = {
  customer_id: "Please fill in customer ID",
  note: "Please fill in note",
  items: "Please fill in items",
  service: "Please fill in the service value",
  delivery: "Please fill in the delivery value",
} as const;

/**
 * POST /draft-bill
 *
 * Kelima bidang memakai present, yang meniru `exists()` apa adanya: cukup
 * dikirim, tanpa peduli tipe maupun isinya. null, teks kosong, dan array kosong
 * semuanya lolos — persis seperti sebelumnya.
 *
 * Sengaja TIDAK diketatkan, meskipun `customer_id` jelas bilangan, `note` jelas
 * teks, dan `items` jelas daftar. Berbeda dari `id` pada endpoint konfirmasi,
 * rantai lama di sini tidak pernah menetapkan tipe apa pun, sehingga tidak ada
 * aturan yang bisa dipindahkan — yang ada hanyalah aturan baru. Frontend yang
 * selama ini mengirim `note: null` atau `customer_id: "12"` akan langsung
 * tertolak, dan tidak ada bukti bahwa nilai seperti itu selalu berakhir galat
 * seperti pada `id`. Pengetatannya keputusan terpisah bersama sisi klien.
 *
 * Perhatikan `exists()` BUKAN pemeriksaan bawaan express-validator melainkan
 * custom validator, sehingga tidak terkena lubang array kosong yang dijelaskan
 * di atas berkas ini: `items: []` sudah diperiksa sejak dulu dan memang lolos.
 * Karena itu tidak ada perubahan perilaku sama sekali pada endpoint ini.
 *
 * `otc` dibaca controller tetapi tidak pernah divalidasi, dulu maupun sekarang.
 */
export const createDraftBillSchema = z.object({
  customer_id: present(PESAN_BUAT.customer_id),
  note: present(PESAN_BUAT.note),
  items: present(PESAN_BUAT.items),
  service: present(PESAN_BUAT.service),
  delivery: present(PESAN_BUAT.delivery),
});

export type DeleteDraftBill = z.infer<typeof deleteDraftBillSchema>;
export type ConfirmDraftBill = z.infer<typeof confirmDraftBillSchema>;
export type CreateDraftBill = z.infer<typeof createDraftBillSchema>;
