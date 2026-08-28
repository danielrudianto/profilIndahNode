import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import {
  present,
  intFromText,
  requiredInt,
  requiredText,
  required,
  jenisJasa,
  aturanJasa,
} from "./common.schema";

/**
 * Kontrak API untuk domain setoran penjualan (sales deposit).
 *
 * Ini jalur uang: /confirm mengubah setoran menjadi faktur penjualan beserta
 * pembayarannya, dan /reject membuat catatan kelebihan bayar. Karena itu semua
 * batas nilai dipertahankan apa adanya dan tidak ada satu pun yang diperlonggar.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutan kunci di sini mengikuti persis urutan pemasangan
 * rantai validator yang digantikan.
 *
 * Kebijakan ketat pada req.body berlaku di sini — lihat penjelasan lengkapnya
 * di common.schema.ts. Ringkasnya: angka yang dikirim sebagai teks, boolean
 * palsu seperti "true", dan nilai bukan-teks pada bidang teks sekarang ditolak.
 *
 * SATU PERBEDAAN LAGI YANG BERLAKU DI SELURUH BERKAS INI — LARIK KOSONG.
 * express-validator memperlakukan bidang yang berisi larik sebagai KUMPULAN
 * nilai dan memeriksa tiap anggotanya. Larik kosong tidak punya anggota,
 * sehingga TIDAK ADA aturan yang dijalankan dan nilainya lolos. Ini berlaku
 * pada semua validator, bukan hanya yang memakai joker:
 *
 *   { year: [] }        dulu 200, sekarang 400 validation.year.required
 *   { isPending: [] }   dulu 200, sekarang 400 error.parameter
 *   { discount: [] }    dulu 200, sekarang 400 validation.discount.required
 *   { type: [] }        dulu 200, sekarang 400 error.parameter
 *
 * Satu-satunya tempat larik kosong memang sah adalah `sales_invoice_payment`
 * pada /confirm, dan di sana perilakunya sengaja dipertahankan.
 */

/**
 * Bilangan pecahan tak negatif — meniru isFloat({ min: 0 }).
 *
 * Berbeda dari `int`, pecahan memang diterima: nilai uang seperti 1500.50 sah.
 * Yang ditolak hanyalah nilai negatif dan bukan-angka. Batas bawahnya TIDAK
 * diperlonggar; nilai negatif ditolak rantai lama dan harus tetap ditolak.
 *
 * Dua pesan karena sebagian rantai lama memasang notEmpty() lalu isFloat()
 * dengan pesan berbeda. Rantai yang hanya memasang isFloat() memakai pesan yang
 * sama untuk keduanya — di situ kedua argumen diisi pesan yang sama.
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
 * Identitas setoran yang dipakai bersama oleh /confirm dan /reject.
 *
 * Keduanya memasang rantai yang sama persis — notEmpty() lalu isInt({ min: 0 })
 * dengan pesan yang sama — jadi bentuknya ditulis sekali. Penyebarannya nanti
 * memakai `...shape` supaya `id` benar-benar menjadi kunci PERTAMA pada skema
 * turunannya; `.extend()` menaruh bidang baru di depan dan akan menukar pesan
 * mana yang muncul lebih dulu.
 */
const identitasSetoran = z.object({
  id: requiredInt(
    ErrorList["ID is required"],
    ErrorList["ID must be numeric"],
    0
  ),
});

/**
 * POST /sales-deposit/archives
 *
 * Rantai lama memeriksa kedua penyaring boolean dalam dua gelombang: dua
 * `exists()` lebih dulu, baru dua `isBoolean()`. Di sini keduanya menyatu per
 * bidang. Pesannya tetap sama karena keempat aturan itu memakai "Parameter
 * error" yang identik, sehingga gelombang mana pun yang gagal lebih dulu
 * menghasilkan kalimat yang sama.
 *
 * `startDate` dan `endDate` sengaja TIDAK ada di sini. Controller membacanya
 * dari req.body, tetapi rantai lama tidak pernah memvalidasinya; menambahkannya
 * sekarang akan menolak permintaan yang selama ini diterima. Lihat catatan
 * cacat di bawah berkas ini.
 */
export const archiveSalesDepositSchema = z.object({
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
  page: requiredInt(
    ErrorList["Page is required"],
    ErrorList["Page must be numeric"],
    1
  ),
  pageSize: requiredInt(
    ErrorList["Page size is required"],
    ErrorList["Page size must be numeric"],
    10,
    50
  ),
  isPending: z.boolean({ error: ErrorList["Parameter error"] }),
  isDelete: z.boolean({ error: ErrorList["Parameter error"] }),
  sortBy: required(ErrorList["Sort by required"]),
  sortDirection: z.enum(["asc", "desc"], {
    error: ErrorList["Sort direction only supports ascending or descending"],
  }),
});

/**
 * Satu baris pembayaran pada /confirm.
 *
 * Anggota yang BUKAN objek tetap harus menghasilkan kalimat yang sama dengan
 * rantai lama, dan rantai lama memberi dua kalimat berbeda untuk kasus itu.
 * Sebabnya, express-validator memeriksa larik per anggota:
 *
 *   body("sales_invoice_payment").notEmpty()
 *     berjalan pada TIAP anggota, sehingga anggota null atau teks kosong gagal
 *     di situ dan pesannya "Payment is required".
 *
 *   body("sales_invoice_payment.*.payment_method_id").exists()
 *     membaca properti dari apa pun isi anggota; anggota berupa angka atau teks
 *     menghasilkan undefined, sehingga pesannya "Payment method required".
 *
 * Tanpa `error` di bawah, Zod akan menjawab dengan kalimat bawaannya sendiri
 * untuk semua anggota bukan-objek.
 *
 * `value` hanya punya satu pesan karena rantai lamanya juga hanya satu aturan:
 * isFloat({ min: 0 }) tanpa notEmpty() di depannya.
 */
const pembayaranSetoranSchema = z.object(
  {
    payment_method_id: present(ErrorList["Payment method required"]),
    value: desimalTakNegatif(
      ErrorList["Amount must be numeric"],
      ErrorList["Amount must be numeric"]
    ),
    date: requiredText(ErrorList["Payment date is required"]),
  },
  {
    error: (iss) =>
      iss.input === null || iss.input === ""
        ? ErrorList["Payment is required"]
        : ErrorList["Payment method required"],
  }
);

/**
 * POST /sales-deposit/confirm
 *
 * LARIK KOSONG DIPERTAHANKAN. `sales_invoice_payment: []` lolos rantai lama —
 * notEmpty() dan isArray() sama-sama meloloskannya, dan joker di belakangnya
 * tidak punya anggota untuk diperiksa. z.array() tanpa .min() berperilaku sama.
 * Sengaja TIDAK dipasang .min(1): controller menjumlahkan pembayaran dengan
 * reduce dan larik kosong menghasilkan 0, yang berarti faktur dibuat tanpa
 * pembayaran — perilaku yang sudah berjalan dan bukan bagian dari migrasi ini.
 *
 * PERBEDAAN URUTAN PESAN PADA LARIK BERISI LEBIH DARI SATU BARIS.
 * express-validator menjalankan rantai per KOLOM: seluruh payment_method_id
 * lebih dulu, baru seluruh value, baru seluruh date. Zod memeriksa per BARIS.
 * Kalau baris pertama salah pada `value` dan baris kedua kehilangan
 * `payment_method_id`, rantai lama menjawab "Payment method required"
 * sedangkan skema ini menjawab "Amount must be numeric". Statusnya sama-sama
 * 400 dan permintaannya sama-sama ditolak; yang berbeda hanya bidang mana yang
 * disebut lebih dulu. Menyusun ulang menjadi per kolom akan membuat skema ini
 * berhenti menyerupai bentuk datanya, jadi urutan per baris dipilih.
 */
export const confirmSalesDepositSchema = z.object({
  ...identitasSetoran.shape,
  /*
    Diteruskan controller ke `new Date(...)` dan ke generateName(). Karena
    tipenya jelas teks, kebijakan ketat berlaku penuh: angka epoch seperti
    1700000000000 dulu diterima notEmpty(), sekarang ditolak.
  */
  date: requiredText(ErrorList["Date required"]),
  sales_invoice_payment: z.array(pembayaranSetoranSchema, {
    error: (iss) =>
      iss.input === undefined || iss.input === null || iss.input === ""
        ? ErrorList["Payment is required"]
        : ErrorList["Payment must be an array"],
  }),
});

/**
 * POST /sales-deposit/reject
 *
 * Tiga bidang terakhir hanya wajib ketika `method` bernilai "create" — rantai
 * lama menyatakannya dengan .if(body("method").equals("create")). Syarat itu
 * membaca bidang lain, sesuatu yang tidak bisa dinyatakan pada level bidang di
 * Zod, jadi dipakai superRefine pada level objek.
 *
 * Urutannya tetap benar: superRefine berjalan SETELAH seluruh shape, dan ketiga
 * bidang bersyarat ini memang berada paling belakang pada rantai lama. Kalau
 * `id` atau `method` sudah gagal, superRefine tidak dijalankan sama sekali —
 * sama seperti rantai lama yang tetap melaporkan galat `id` lebih dulu.
 *
 * PERBEDAAN YANG DISENGAJA — `method` berupa larik satu anggota.
 * isIn() bekerja pada bentuk teks nilainya, sehingga `method: ["create"]` dulu
 * lolos (larik satu anggota diperiksa per anggota) dan permintaannya diproses
 * sebagai "create". z.enum menolaknya dengan "Parameter error". Keduanya 400
 * untuk badan yang sama-sama cacat, hanya kalimatnya berbeda.
 */
export const rejectSalesDepositSchema = z
  .object({
    ...identitasSetoran.shape,
    method: z.enum(["create", "delete"], {
      error: ErrorList["Parameter error"],
    }),
    /*
      Ketiganya dibiarkan bebas di level shape dan diperiksa di superRefine.
      `.optional()` wajib ada: z.unknown() tanpa itu menolak kunci yang tidak
      dikirim, padahal bidangnya memang boleh hilang ketika method "delete".
    */
    return_payment_date: z.unknown().optional(),
    return_payment_method: z.unknown().optional(),
    return_payment_name: z.unknown().optional(),
  })
  .superRefine((nilai, ctx) => {
    if (nilai.method !== "create") {
      return;
    }

    /*
      requiredText, bukan required: ketiganya bidang teks yang diteruskan apa
      adanya ke overpaymentRepository.createMany, jadi kebijakan ketat berlaku.
      Nilai bukan-teks seperti angka 5 dulu lolos notEmpty(), sekarang ditolak.
    */
    const bersyarat: Array<[string, unknown, string]> = [
      [
        "return_payment_date",
        nilai.return_payment_date,
        ErrorList["Date required"],
      ],
      [
        "return_payment_method",
        nilai.return_payment_method,
        ErrorList["Return payment method is required"],
      ],
      [
        "return_payment_name",
        nilai.return_payment_name,
        ErrorList["Return payment name is required"],
      ],
    ];

    for (const [jalur, isi, pesan] of bersyarat) {
      if (!requiredText(pesan).safeParse(isi).success) {
        ctx.addIssue({ code: "custom", path: [jalur], message: pesan });
      }
    }
  });

/**
 * POST /sales-deposit
 *
 * CACAT LAMA YANG SENGAJA DIPERTAHANKAN. Rantai lama memasang pesan diskon
 * pada `delivery` dan `service`:
 *
 *   body("delivery").notEmpty().withMessage(ErrorList["Discount required"])
 *   body("service").notEmpty().withMessage(ErrorList["Discount required"])
 *
 * Ketiganya hasil salin-tempel, sehingga pengguna yang lupa mengisi ongkos
 * kirim diberi tahu bahwa diskonnya yang kosong. sales-invoice.schema.ts sudah
 * memperbaikinya menjadi key `validation.delivery.*` dan `validation.service.*`.
 * Di sini pesannya SENGAJA dibiarkan salah supaya migrasi ini tidak membawa
 * perubahan kalimat di luar kebijakan ketat. Perbaikannya perlu naik bersama
 * frontend, sama seperti yang dilakukan pada faktur penjualan.
 *
 * `sales_invoice`, `sales_invoice_payment`, `payment_term`, `date`, dan `sales`
 * juga dibaca controller tetapi tidak pernah divalidasi rantai lama, jadi tidak
 * ditambahkan di sini.
 */
export const createSalesDepositSchema = z
  .object({
    uuid: required(ErrorList["Parameter error"]),
    customer_id: present(ErrorList["Customer ID is required"]),
    discount: desimalTakNegatif(
      ErrorList["Discount required"],
      ErrorList["Discount must be numeric"]
    ),
    delivery: desimalTakNegatif(
      ErrorList["Discount required"],
      ErrorList["Discount must be numeric"]
    ),
    service: desimalTakNegatif(
      ErrorList["Discount required"],
      ErrorList["Discount must be numeric"]
    ),
    admin_fee: desimalTakNegatif(
      ErrorList["Admin fee required"],
      ErrorList["Admin fee must be numeric"]
    ),
    service_type: jenisJasa,
    is_paid: z.boolean({ error: ErrorList["Payment status is required"] }),
    type: z.enum(["INTERNAL", "EXTERNAL"], {
      error: ErrorList["Parameter error"],
    }),
  })
  .superRefine(aturanJasa);

/**
 * GET /sales-deposit/:id
 *
 * Nilai pada req.params selalu teks, sehingga dipakai varian *FromText —
 * kebijakan ketat hanya berlaku pada req.body. Batas bawahnya 1, bukan 0,
 * karena rantai lama memakai isInt({ min: 1 }); `paramId` dari common.schema.ts
 * memakai 0 dan karena itu tidak bisa dipakai di sini.
 *
 * Kedua aturan lama — isNumeric() lalu isInt({ min: 1 }) — memakai pesan yang
 * sama, jadi satu pesan sudah cukup.
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA. intFromText mengubah teks menjadi angka
 * dengan Number(), sedangkan isNumeric() bekerja pada bentuk teksnya. Beberapa
 * penulisan yang dulu ditolak sekarang diterima: "1e2" (100), "0x10" (16), dan
 * " 5 ". Angkanya sendiri tetap bilangan bulat >= 1 saat sampai ke controller,
 * jadi tidak ada nilai baru yang bisa lolos ke basis data — yang berubah hanya
 * penulisan yang diampuni. Perlakuan ini sama dengan getOverpaymentSchema di
 * overpayment.schema.ts, supaya penulisan id tidak berbeda antar rute.
 */
export const paramSalesDepositSchema = z.object({
  id: intFromText(ErrorList["Parameter error"], 1),
});

export type ArchiveSalesDeposit = z.infer<typeof archiveSalesDepositSchema>;
export type ConfirmSalesDeposit = z.infer<typeof confirmSalesDepositSchema>;
export type RejectSalesDeposit = z.infer<typeof rejectSalesDepositSchema>;
export type CreateSalesDeposit = z.infer<typeof createSalesDepositSchema>;
export type ParamSalesDeposit = z.infer<typeof paramSalesDepositSchema>;
