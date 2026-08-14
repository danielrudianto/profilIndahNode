import { z } from "zod";
import ErrorList from "../constants/error_list";
import { intFromText, requiredText } from "./common.schema";

/**
 * Kontrak API untuk paket produk (package_code + package_content).
 *
 * Susunannya mengikuti empat lapis seperti supplier.schema.ts:
 *
 *   Base      bidang bersama POST dan PUT — price, name, description
 *   Create    Base ditambah package_content
 *   Update    id di depan, lalu Base
 *   Param     parameter jalur :id untuk GET dan DELETE
 *
 * Lapis Base itu yang membuat aturan harga, nama, dan keterangan tidak ditulis
 * dua kali. Pada berkas route sebelumnya ketiganya memang disalin di POST dan
 * PUT; mengubah salah satunya saja akan membuat kedua endpoint diam-diam
 * berbeda.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutan kunci di sini mengikuti urutan rantai validator yang
 * digantikan. Karena itu skema Update dirakit dengan menyebar `Base.shape` di
 * belakang `id`, bukan dengan `.extend()` — `.extend()` selalu menempelkan
 * kunci baru di BELAKANG, sehingga `id` berpindah ke urutan terakhir dan pesan
 * pertama pada badan kosong berubah dari "error.parameter" menjadi pesan harga.
 */

/**
 * KEBIJAKAN KETAT PADA req.body — lihat uraian lengkapnya di common.schema.ts.
 *
 * Semua bidang badan di bawah memakai z.number()/z.string(), yang MENOLAK
 * angka berbentuk teks ("5") dan nilai bukan teks pada bidang teks (123, objek).
 * Rantai lama meloloskan keduanya karena express-validator mengubah setiap
 * nilai menjadi teks sebelum memeriksanya. Perbedaannya disengaja dan diuji
 * berpasangan di tests/product-package.schema.test.ts: tiap kasus membuktikan
 * "dulu 200, sekarang 400", bukan sekadar "sekarang ditolak".
 *
 * Di paket produk taruhannya nyata: `price` dan `quantity` masuk ke kolom
 * Decimal dan Int lewat Prisma. Nilai teks yang lolos validasi baru gagal di
 * lapisan basis data dan muncul ke pengguna sebagai 500, bukan 400.
 */

/**
 * Batas panjang diambil dari lebar kolom di prisma/schema.prisma.
 *
 *   package_code.name        VarChar(45)
 *   package_code.description VarChar(200)
 *
 * package_code.price bertipe Decimal(10,2) dan package_content.price
 * Decimal(12,2); keduanya batas ketelitian angka, bukan panjang teks, jadi
 * tidak diterjemahkan menjadi aturan di sini.
 */
const PANJANG = {
  name: 45,
  description: 200,
} as const;

/**
 * Nilai yang dianggap KOSONG oleh notEmpty() milik rantai lama.
 *
 * Cukup tiga nilai ini. Larik SENGAJA tidak masuk hitungan: express-validator
 * memperlakukan bidang berisi larik sebagai kumpulan nilai, sehingga
 * `{"price": []}` — nol anggota — tidak diperiksa sama sekali dan lolos dengan
 * 200, bukan gagal sebagai nilai kosong. Larik ditolak di sini lewat z.number()
 * sebagai bagian dari kebijakan ketat, dengan pesan "salah bentuk".
 */
const kosong = (nilai: unknown) =>
  nilai === undefined || nilai === null || nilai === "";

/* ================================================================== */
/* Paket — bidang bersama                                              */
/* ================================================================== */

/**
 * Harga paket.
 *
 * Rantai lama hanya memasang notEmpty(), sehingga harga negatif dan harga
 * berupa boolean pun diterima. Batas bawah SENGAJA tidak ditambahkan: itu
 * aturan baru yang menolak permintaan yang selama ini diterima, dan keputusan
 * itu perlu dibahas bersama sisi klien terpisah dari migrasi ini. Yang berubah
 * di sini hanya tipenya, mengikuti kebijakan ketat.
 *
 * Perhatikan bedanya dengan `hargaBaris` pada /price-sales di bawah: di sana
 * rantai lama memakai isFloat({ min: 0 }) sehingga nilai negatif memang sudah
 * ditolak sejak dulu, dan pesannya pun dua macam.
 */
const hargaPaket = z.number({ error: ErrorList["Price is required"] });

/** Bidang yang dipakai bersama oleh POST / dan PUT /. */
const paketBase = z.object({
  price: hargaPaket,
  name: requiredText(ErrorList["Package name required"]).max(
    PANJANG.name,
    ErrorList["Package name too long"]
  ),
  description: requiredText(ErrorList["Package description required"]).max(
    PANJANG.description,
    ErrorList["Package description too long"]
  ),
});

/* ================================================================== */
/* POST /product-package                                               */
/* ================================================================== */

/**
 * Satu baris isi paket — terjemahan dari body("package_content.*.field").
 *
 * Urutan kuncinya mengikuti urutan rantai lama: product_id, quantity,
 * product_unit_id, price.
 *
 * `product_unit_id` boleh null dan itu BUKAN kelalaian. Rantai lama memakai
 * exists(), yang hanya menolak undefined, dan kolom
 * package_content.product_unit_id memang nullable — paket yang memakai satuan
 * dasar produk mengirim null. Karena itu dipakai `.nullable()`, bukan
 * `.optional()`: bidangnya tetap wajib ADA, isinya boleh null.
 *
 * `quantity` sengaja tidak dibatasi .int() walaupun kolomnya bertipe Int, dan
 * `price` sengaja tidak dibatasi minimal 0. Rantai lama hanya memasang
 * notEmpty() pada keduanya, sehingga 1.5 dan -5 selama ini diterima;
 * menolaknya sekarang adalah aturan baru di luar kebijakan ketat.
 */
const isiPaket = z.object({
  product_id: z.number({ error: ErrorList["Package item id required"] }),
  quantity: z.number({ error: ErrorList["Package item quantity required"] }),
  product_unit_id: z
    .number({ error: ErrorList["Package item unit id required"] })
    .nullable(),
  price: z.number({ error: ErrorList["Package item price required"] }),
});

/**
 * POST /product-package
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA pada `package_content`: nilai yang BUKAN
 * larik sekarang ditolak.
 *
 * express-validator memperlakukan bidang berisi larik sebagai KUMPULAN nilai
 * dan memeriksa tiap anggotanya lewat pola `package_content.*.product_id`.
 * Akibatnya:
 *
 *   package_content: []       nol anggota — tidak diperiksa sama sekali, 200
 *   package_content: {}       tidak punya kunci — juga tidak diperiksa, 200
 *   package_content: "abc"    pola joker tidak cocok apa pun, 200
 *   package_content: 5        sama, 200
 *   package_content: {a:1}    kunci "a" diperiksa, 400 "item id wajib"
 *
 * Tiga kasus tengah lolos validasi lalu sampai ke controller, yang memanggil
 * `package_content.map(...)` dan melempar TypeError — pengguna menerima 500.
 * z.array() menutup lubang itu dan mengubah 500 menjadi 400 dengan pesan yang
 * sudah ada, "Package items required".
 *
 * LARIK KOSONG tetap diterima, persis seperti dulu. `[].map(...)` tidak
 * melempar apa pun; paket tanpa isi memang tersimpan. Menolaknya adalah aturan
 * baru, bukan penutupan lubang, jadi tidak dilakukan di sini.
 */
export const createPackageSchema = z.object({
  ...paketBase.shape,
  package_content: z.array(isiPaket, {
    error: ErrorList["Package items required"],
  }),
});

/* ================================================================== */
/* PUT /product-package                                                */
/* ================================================================== */

/**
 * PUT /product-package
 *
 * `id` hanya diperiksa berupa angka, tanpa .int() dan tanpa batas bawah.
 * Rantai lama memakai isNumeric() saja, sehingga 0, -3, dan 1.5 selama ini
 * diterima dan diteruskan ke repository. Mengetatkannya menjadi bilangan bulat
 * minimal 1 — seperti yang dilakukan pada parameter jalur di bawah — akan
 * menolak permintaan yang selama ini dijawab 404 oleh controller, jadi
 * perubahan itu dibiarkan sebagai keputusan terpisah.
 *
 * Yang berubah hanya tipenya: `{"id": "1"}` dan `{"id": []}` dulu lolos
 * isNumeric() dan sekarang ditolak, mengikuti kebijakan ketat.
 */
export const updatePackageSchema = z.object({
  id: z.number({ error: ErrorList["Parameter error"] }),
  ...paketBase.shape,
});

/* ================================================================== */
/* PUT /product-package/price-sales                                    */
/* ================================================================== */

/**
 * Harga pada perubahan massal.
 *
 * Dua pesan berbeda karena rantai lama memasang dua aturan berurutan pada
 * bidang yang sama: notEmpty() dengan "Price is required", lalu
 * isFloat({ min: 0 }) dengan "Price must be numeric". Skema dengan satu pesan
 * saja akan mengubah kalimat yang dilihat pengguna pada salah satu kasus.
 *
 * Batas bawah 0 DIPERTAHANKAN di sini justru karena rantai lamanya memang
 * memakai isFloat({ min: 0 }) — harga negatif sudah ditolak sejak dulu.
 * Pecahan tetap diterima; isFloat memang mengizinkannya.
 */
const hargaBaris = z
  .number({
    error: (iss) =>
      kosong(iss.input)
        ? ErrorList["Price is required"]
        : ErrorList["Price must be numeric"],
  })
  .min(0, ErrorList["Price must be numeric"]);

/** Satu baris perubahan harga — terjemahan dari body("items.*.field"). */
const barisHarga = z.object({
  package_code_id: z.number({ error: ErrorList["Package ID is required"] }),
  price: hargaBaris,
});

/**
 * PUT /product-package/price-sales
 *
 * `items` memakai pesan "Parameter error", sama seperti isArray() pada rantai
 * lama — dan cocok persis: nilai yang tidak dikirim, null, teks, maupun objek
 * sama-sama membalas 400 dengan pesan itu, dulu dan sekarang.
 *
 * Larik kosong tetap diterima. Rantai lama meloloskannya karena pola
 * `items.*.package_code_id` tidak cocok dengan anggota mana pun, dan
 * controller pun aman: `for (let item of [])` tidak berputar sekali pun.
 *
 * ErrorList["Package ID must be numeric"] sengaja TIDAK dipakai walaupun
 * key-nya ada. Rantai lama hanya memasang satu aturan pada package_code_id, jadi
 * pengguna tidak pernah bisa membedakan "tidak dikirim" dari "salah bentuk";
 * memunculkan pesan kedua sekarang berarti menampilkan kalimat baru yang belum
 * pernah dilihat frontend.
 */
export const updatePackagePriceSchema = z.object({
  items: z.array(barisHarga, { error: ErrorList["Parameter error"] }),
});

/* ================================================================== */
/* GET dan DELETE /product-package/:id                                 */
/* ================================================================== */

/**
 * Parameter jalur `:id` untuk GET dan DELETE.
 *
 * Dipakai intFromText, bukan z.number(): nilai pada req.params selalu berupa
 * teks dan tidak ada tipe asli yang bisa dipertahankan, jadi kebijakan ketat
 * tidak berlaku di sini.
 *
 * Batas bawah 1 mengikuti isInt({ min: 1 }) pada rantai lama — karena itu
 * `paramId` dari common.schema.ts tidak dipakai, batas bawahnya 0.
 *
 * SISA PERBEDAAN YANG DIKETAHUI: pemaksaan Number() lebih longgar daripada
 * isInt(). Bentuk seperti "1e3", "1.0", dan " 1 " dulu ditolak 400 dan
 * sekarang diterima sebagai 1000, 1, dan 1. Ketiganya hanya bisa muncul kalau
 * klien menyusun URL dengan tangan, dan nilainya tetap bilangan bulat yang sah
 * sampai ke controller — jadi kelonggaran ini dibiarkan demi memakai helper
 * yang sama dengan seluruh repo, dan dicatat di berkas tes.
 */
export const paramPackageSchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});

export type CreatePackage = z.infer<typeof createPackageSchema>;
export type UpdatePackage = z.infer<typeof updatePackageSchema>;
export type UpdatePackagePrice = z.infer<typeof updatePackagePriceSchema>;
