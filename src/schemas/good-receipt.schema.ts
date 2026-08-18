import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import {
  present,
  intFromText,
  requiredInt,
  requiredIntFromText,
  requiredText,
  required,
} from "./common.schema";

/**
 * Kontrak API untuk domain penerimaan barang (good receipt).
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutan kunci di tiap skema mengikuti urutan rantai validator
 * yang digantikan — bukan urutan yang paling enak dibaca. Karena itu bentuk
 * objek dirakit dengan menyebar `...Base.shape` dan bukan dengan `.extend()`,
 * yang selalu menempelkan kunci baru DI BELAKANG kunci yang sudah ada.
 *
 * Kebijakan ketat pada req.body berlaku di sini — lihat penjelasan lengkapnya
 * di common.schema.ts. Angka yang dikirim sebagai teks, teks yang dikirim
 * sebagai angka, dan boolean palsu seperti "true" ditolak. Pada req.params
 * dipakai varian *FromText, karena di sana nilai memang selalu teks.
 *
 * LUBANG LARIK PADA RANTAI LAMA.
 *
 * Pemeriksaan bawaan express-validator (notEmpty, isInt, isFloat, isBoolean,
 * isIn) dijalankan lewat StandardValidation, yang memperlakukan bidang berisi
 * larik sebagai KUMPULAN nilai:
 *
 *   const values = Array.isArray(value) ? value : [value];
 *   values.forEach(...)
 *
 * Untuk larik KOSONG jumlah anggotanya nol, sehingga perulangannya tidak
 * berjalan sekali pun dan bidang itu lolos TANPA DIPERIKSA SAMA SEKALI.
 * `{"name": []}`, `{"date": []}`, dan `{"isActive": []}` selama ini membalas
 * 200 justru karena tidak ada yang memeriksanya. Skema di bawah menutup lubang
 * itu; semuanya diuji berpasangan di tests/good-receipt.schema.test.ts.
 *
 * Pengecualiannya `exists()` dan `isArray()`, yang bukan pemeriksaan bawaan
 * melainkan custom validator. Keduanya menerima nilai aslinya utuh, sehingga
 * larik kosong tetap diperiksa di sana dan memang lolos — perilaku itu
 * dipertahankan (`good_receipt: []` tetap 200 di kedua sisi).
 *
 * BATAS PANJANG TEKS diambil dari lebar kolom di prisma/schema.prisma:
 *
 *   good_receipt_code.name         VarChar(100)
 *   good_receipt_code.invoice_name String — pada MySQL dipetakan ke VarChar(191)
 *   good_receipt_code.faktur       String? — VarChar(191), lihat catatan faktur
 *
 * Pesan batas panjang memakai key khususnya sendiri. Sempat tidak ada — domain
 * ini tidak punya satu pun key "too long" sehingga nama yang terlalu panjang
 * dilaporkan memakai kalimat "nama wajib diisi" milik bidang yang sama. Key
 * "Good receipt name too long" dan "Invoice name too long" kemudian ditambahkan
 * ke ErrorList berikut terjemahannya di docs/i18n/id.json, dan paritas keduanya
 * dijaga tests/i18n-parity.test.ts.
 */
const PANJANG = {
  name: 100,
  invoice_name: 191,
} as const;

/**
 * Bilangan pecahan tak negatif — meniru rantai notEmpty() lalu isFloat({min: 0}).
 *
 * Berbeda dari `int`, pecahan memang diterima: harga 1500.50 dan kuantitas 2.5
 * keduanya sah. Yang ditolak hanyalah nilai negatif dan bukan-angka.
 *
 * Bentuknya sama persis dengan helper bernama sama di sales-invoice.schema.ts.
 * Keduanya sengaja belum disatukan ke common.schema.ts: pemindahannya menyentuh
 * berkas milik domain lain, dan itu perubahan tersendiri.
 */
const desimalTakNegatif = (pesanKosong: string, pesanSalah: string) =>
  z
    .number({
      error: (iss) =>
        iss.input === undefined || iss.input === null || iss.input === ""
          ? pesanKosong
          : pesanSalah,
    })
    .min(0, pesanSalah);

/**
 * Larik barang dengan dua pesan berbeda, meniru rantai notEmpty() lalu
 * isArray() yang dipasang berurutan pada bidang yang sama.
 *
 * notEmpty() gagal ketika bidangnya tidak dikirim, null, atau teks kosong;
 * isArray() gagal untuk nilai lain yang bukan larik. Skema dengan satu pesan
 * saja akan mengubah kalimat yang dilihat pengguna pada salah satu dari
 * keduanya.
 */
const larikBarang = <T extends z.ZodType>(
  anggota: T,
  pesanKosong: string,
  pesanBukanLarik: string
) =>
  z.array(anggota, {
    error: (iss) =>
      iss.input === undefined || iss.input === null || iss.input === ""
        ? pesanKosong
        : pesanBukanLarik,
  });

/**
 * Satu baris barang pada POST / dan PUT /.
 *
 * Rantai lama memakai sintaks joker express-validator — body("good_receipt.*.
 * product_id") dan seterusnya. Di sini diterjemahkan menjadi larik objek.
 *
 * PERBEDAAN URUTAN PESAN YANG DIKETAHUI. express-validator menjalankan satu
 * rantai per BIDANG dan mengumpulkan galatnya untuk seluruh anggota larik
 * sekaligus, sehingga urutan pesannya bidang-dulu: semua galat `product_id`
 * (dari anggota mana pun) mendahului galat `price`. Zod memeriksa
 * anggota-dulu: seluruh bidang anggota pertama mendahului anggota kedua.
 *
 * Selisihnya baru terlihat bila DUA anggota berbeda gagal pada bidang yang
 * berbeda, misalnya anggota ke-0 salah harganya dan anggota ke-1 salah
 * product_id-nya: dulu muncul "Product ID must be numeric", sekarang "Price
 * must be numeric". Statusnya tetap 400 dan kedua pesan itu sama-sama benar
 * untuk badan yang dikirim; yang berubah hanya bidang mana yang dilaporkan
 * lebih dulu. Menirunya persis berarti menulis ulang pemeriksaan larik dengan
 * superRefine bidang-per-bidang dan kehilangan tipe hasil parse — harganya
 * tidak sepadan.
 */
const barangBase = z.object({
  product_id: requiredInt(
    ErrorList["Product ID is required"],
    ErrorList["Product ID must be numeric"],
    1
  ),
  price: desimalTakNegatif(
    ErrorList["Price is required"],
    ErrorList["Price must be numeric"]
  ),
  discount: desimalTakNegatif(
    ErrorList["Discount required"],
    ErrorList["Discount must be numeric"]
  ),
  quantity: desimalTakNegatif(
    ErrorList["Quantity required"],
    ErrorList["Quantity must be numeric"]
  ),
});

/**
 * Pasangan perusahaan dan pemasok, dipakai POST / dan PUT / dengan pesan yang
 * sama persis.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA: keduanya menjadi bilangan bulat minimal 1.
 * Rantai lama hanya memasang notEmpty(), yang bekerja pada bentuk TEKS nilainya
 * — sehingga "5", "abc", 0, dan {} sama-sama lolos, lalu diteruskan apa adanya
 * ke kolom `good_receipt_code.company_id` dan `good_receipt_code.supplier_id`
 * yang bertipe Int. Prisma menolaknya dengan galatnya sendiri dan pengguna
 * menerima 500. Jadi tidak ada pemanggil yang selama ini berhasil mengirim
 * teks; yang berubah hanyalah galatnya menjadi 400 yang jelas. Batas bawah 1
 * mengikuti kolom id yang memakai autoincrement mulai dari 1, sehingga 0 dan
 * negatif tidak pernah cocok dengan baris mana pun.
 *
 * Kedua pesan pada requiredInt sengaja SAMA. Rantai lama hanya punya satu pesan
 * untuk masing-masing bidang, jadi pengguna tidak pernah bisa membedakan
 * "tidak dikirim" dari "salah bentuk"; menambah pesan baru di sini berarti
 * mengubah kalimat yang dilihat pengguna.
 */
const relasiBase = z.object({
  company_id: requiredInt(
    ErrorList["Company ID required"],
    ErrorList["Company ID required"],
    1
  ),
  supplier_id: requiredInt(
    ErrorList["Supplier ID required"],
    ErrorList["Supplier ID required"],
    1
  ),
});

/**
 * POST /good-receipt/archives
 *
 * `page`, `keyword`, `startDate`, dan `endDate` sengaja TIDAK divalidasi,
 * sama seperti rantai lama — padahal `fetchArchives` membaca keempatnya.
 * Menambahkannya sekarang berarti memunculkan pesan galat baru yang belum
 * pernah dilihat frontend; itu keputusan terpisah bersama sisi klien.
 *
 * Perhatikan rute ini TIDAK memvalidasi `pageSize`: controller mengambilnya
 * dari process.env.LIMIT, bukan dari badan permintaan.
 */
export const archiveGoodReceiptSchema = z.object({
  year: requiredInt(
    ErrorList["Year is required"],
    ErrorList["Year must be numeric"],
    2000
  ),
  month: requiredInt(
    ErrorList["Month is required"],
    ErrorList["Month must be numeric"],
    1,
    12
  ),
  isActive: z.boolean({ error: ErrorList["Parameter error"] }),
  isDelete: z.boolean({ error: ErrorList["Parameter error"] }),
  isPending: z.boolean({ error: ErrorList["Parameter error"] }),
  sortBy: required(ErrorList["Sort by required"]),
  sortDirection: z.enum(["asc", "desc"], {
    error: ErrorList["Sort direction only supports ascending or descending"],
  }),
  /*
    Aturan BARU, bukan migrasi: rantai lama tidak pernah memeriksa kedua
    tanggal ini padahal controller selalu membacanya — absen atau tak
    terbaca meledak jadi 500 lewat Invalid Date ke Prisma. Pesannya
    memakai key yang sudah bertranslasi di kedua bahasa.
  */
  startDate: z
    .any()
    .refine((nilai) => !Number.isNaN(new Date(String(nilai)).getTime()), {
      message: ErrorList["Date required"],
    }),
  endDate: z
    .any()
    .refine((nilai) => !Number.isNaN(new Date(String(nilai)).getTime()), {
      message: ErrorList["Date required"],
    }),
});

/**
 * POST /good-receipt/check
 *
 * `name` memakai present, yang meniru `exists()` apa adanya: cukup dikirim,
 * tanpa peduli tipe maupun isinya. null, teks kosong, dan larik kosong
 * semuanya lolos — persis seperti sebelumnya.
 *
 * Sengaja TIDAK diketatkan menjadi teks meskipun nilainya diteruskan ke
 * `fetchByName`. Berbeda dari `name` pada POST / yang benar-benar tersimpan ke
 * kolom VarChar, di sini nilainya hanya dipakai sebagai kata pencarian dan
 * `exists()` tidak pernah menetapkan tipe apa pun, sehingga tidak ada aturan
 * yang bisa dipindahkan — yang ada hanyalah aturan baru.
 */
export const checkGoodReceiptSchema = z.object({
  name: present(ErrorList["Name required"]),
});

/**
 * POST /good-receipt
 *
 * `date` memakai required dan bukan teks. Controller memanggil
 * `new Date(req.body.date)`, yang menerima teks ISO maupun angka epoch, jadi
 * memaksakan salah satunya adalah aturan baru.
 *
 * `name` diketatkan menjadi teks sesuai kebijakan ketat: nilainya benar-benar
 * tersimpan ke `good_receipt_code.name`, dan angka maupun objek yang dulu lolos
 * tersimpan sebagai "123" dan "[object Object]".
 *
 * CACAT KODE LAMA YANG SENGAJA DIPERTAHANKAN: rantai ini tidak memvalidasi
 * `uuid`, `invoice_name`, `faktur`, `discount`, maupun `is_confirm`, padahal
 * `create` membaca kelimanya dan `good_receipt_code.uuid` adalah kolom NOT NULL
 * ber-UNIQUE. Permintaan tanpa `uuid` lolos validasi lalu gagal di Prisma
 * sebagai 500. Tidak diperbaiki di sini karena menambahkannya memunculkan pesan
 * galat baru yang belum pernah dilihat frontend.
 */
export const createGoodReceiptSchema = z.object({
  date: required(ErrorList["Date required"]),
  name: requiredText(ErrorList["Name required"]).max(
    PANJANG.name,
    ErrorList["Good receipt name too long"]
  ),
  ...relasiBase.shape,
  good_receipt: larikBarang(
    barangBase,
    ErrorList["Good receipt required"],
    ErrorList["Good receipt must be array"]
  ),
});

/**
 * PUT /good-receipt — dan POST /good-receipt varian superadministrator, yang
 * memakai rantai yang sama persis.
 *
 * CACAT KODE LAMA YANG SENGAJA DIPERTAHANKAN: pesan `name` dan `invoice_name`
 * tertukar. Di sini `name` memakai ErrorList["Invoice name required"] dan
 * `invoice_name` memakai ErrorList["Name required"] — kebalikan dari PUT
 * /confirm, yang memasangkan keduanya dengan benar. Selama nilainya masih
 * kalimat Indonesia akibatnya "hanya" membingungkan; setelah ErrorList berisi
 * key i18n, frontend menerima `validation.invoice.nameRequired` untuk kolom
 * Nama dan tidak punya cara membedakannya. Pesannya TIDAK diperbaiki di sini
 * karena aturan migrasi mensyaratkan kalimatnya identik; perbaikannya harus
 * naik bersama sisi klien.
 *
 * `id` memakai satu pesan untuk kedua cabang requiredInt, karena rantai lama pun
 * hanya memasang notEmpty() tanpa isInt() pada rute ini — berbeda dari PUT
 * /confirm dan PUT /reject yang memasang keduanya.
 */
export const updateGoodReceiptSchema = z.object({
  id: requiredInt(ErrorList["ID is required"], ErrorList["ID is required"], 1),
  date: required(ErrorList["Date required"]),
  name: requiredText(ErrorList["Invoice name required"]).max(
    PANJANG.name,
    ErrorList["Good receipt name too long"]
  ),
  faktur: present(ErrorList["Tax invoice required"]),
  invoice_name: requiredText(ErrorList["Name required"]).max(
    PANJANG.invoice_name,
    ErrorList["Invoice name too long"]
  ),
  ...relasiBase.shape,
  good_receipt: larikBarang(
    barangBase,
    ErrorList["Good receipt required"],
    ErrorList["Good receipt must be array"]
  ),
  discount: desimalTakNegatif(
    ErrorList["Discount required"],
    ErrorList["Discount must be numeric"]
  ),
});

/**
 * PUT /good-receipt/confirm
 *
 * `faktur` memakai present, meniru `exists()`. Sengaja TIDAK diketatkan
 * menjadi teks meskipun kolomnya VarChar: `good_receipt_code.faktur` boleh
 * NULL, dan klien yang belum menerima faktur pajak memang mengirim
 * `faktur: null`. Menjadikannya z.string() akan menolak permintaan yang selama
 * ini sah. Batas panjang 191 karakter karena itu juga tidak dipasang di sini —
 * pengetatannya perlu dibahas dengan sisi klien lebih dulu.
 *
 * `good_receipt` di sini hanya memakai isArray() tanpa notEmpty(), sehingga
 * satu pesan saja: badan tanpa `good_receipt` pun dijawab "Good receipt must be
 * array".
 *
 * Anggota larik memakai `id` dengan required saja, meniru notEmpty(). Rantai
 * lama tidak pernah memasang isInt() di sana, berbeda dari `id` di tingkat atas.
 */
export const confirmGoodReceiptSchema = z.object({
  id: requiredInt(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    1
  ),
  name: requiredText(ErrorList["Name required"]).max(
    PANJANG.name,
    ErrorList["Good receipt name too long"]
  ),
  invoice_name: requiredText(ErrorList["Invoice name required"]).max(
    PANJANG.invoice_name,
    ErrorList["Invoice name required"]
  ),
  date: required(ErrorList["Date required"]),
  faktur: present(ErrorList["Tax invoice required"]),
  good_receipt: z.array(
    z.object({
      id: required(ErrorList["Good receipt ID required"]),
      price: desimalTakNegatif(
        ErrorList["Price is required"],
        ErrorList["Price must be numeric"]
      ),
      discount: desimalTakNegatif(
        ErrorList["Discount required"],
        ErrorList["Discount must be numeric"]
      ),
    }),
    { error: ErrorList["Good receipt must be array"] }
  ),
});

/** PUT /good-receipt/reject */
export const rejectGoodReceiptSchema = z.object({
  id: requiredInt(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    1
  ),
});

/**
 * GET /good-receipt/:id
 *
 * Rantai lama memasang isNumeric() lalu isInt({ min: 1 }) dengan pesan yang
 * IDENTIK, sehingga aturan mana pun yang gagal lebih dulu menghasilkan kalimat
 * yang sama dan satu pemeriksaan saja sudah cukup di sini.
 *
 * Nilai pada req.params selalu teks, jadi dipakai varian yang menerima teks —
 * kebijakan ketat hanya berlaku pada req.body.
 */
export const paramGoodReceiptSchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});

/**
 * DELETE /good-receipt/:id
 *
 * Berbeda dari GET /:id, rute ini memakai dua pesan: notEmpty() menjawab "ID is
 * required" dan isInt({ min: 1 }) menjawab "ID must be numeric". Perbedaan
 * kalimat itu dipertahankan, jadi keduanya tidak bisa memakai skema yang sama.
 */
export const deleteGoodReceiptSchema = z.object({
  id: requiredIntFromText(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    1
  ),
});

export type ArchiveGoodReceipt = z.infer<typeof archiveGoodReceiptSchema>;
export type CheckGoodReceipt = z.infer<typeof checkGoodReceiptSchema>;
export type CreateGoodReceipt = z.infer<typeof createGoodReceiptSchema>;
export type UpdateGoodReceipt = z.infer<typeof updateGoodReceiptSchema>;
export type ConfirmGoodReceipt = z.infer<typeof confirmGoodReceiptSchema>;
export type RejectGoodReceipt = z.infer<typeof rejectGoodReceiptSchema>;
