import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { jenisJasa, aturanJasa } from "./common.schema";
import { present, requiredInt, required } from "./common.schema";

/**
 * Kontrak API untuk domain faktur penjualan.
 *
 * URUTAN BIDANG PENTING. Pesan yang sampai ke pengguna adalah pesan pertama
 * yang gagal, jadi urutannya mengikuti rantai validator yang digantikan.
 *
 * Kebijakan ketat pada req.body berlaku di sini — lihat penjelasannya di
 * common.schema.ts. Angka yang dikirim sebagai teks ditolak.
 */

/**
 * Bilangan pecahan tak negatif — meniru isFloat({ min: 0 }).
 *
 * Berbeda dari `int`, pecahan memang diterima di sini: nilai uang seperti
 * 1500.50 sah. Yang ditolak hanyalah nilai negatif dan bukan-angka.
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
 * POST /sales-invoice/archives
 *
 * Rantai lama memeriksa keempat penyaring boolean dalam dua gelombang: empat
 * `exists()` lebih dulu, baru empat `isBoolean()`. Di sini keduanya menyatu
 * per bidang. Pesannya tetap sama karena kedelapan aturan itu memakai
 * "Parameter error" yang identik, sehingga gelombang mana pun yang gagal
 * lebih dulu menghasilkan kalimat yang sama.
 */
export const invoiceArchiveSchema = z.object({
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
  isPaid: z.boolean({ error: ErrorList["Parameter error"] }),
  isUnpaid: z.boolean({ error: ErrorList["Parameter error"] }),
  isActive: z.boolean({ error: ErrorList["Parameter error"] }),
  isDelete: z.boolean({ error: ErrorList["Parameter error"] }),
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
 * POST /sales-invoice/sales-return
 *
 * Rantai lama memakai sintaks joker express-validator: body("sales_invoice.*.
 * product_id"). Di sini diterjemahkan menjadi larik objek.
 *
 * Perlu diketahui: express-validator memperlakukan bidang berisi larik sebagai
 * KUMPULAN nilai dan memeriksa tiap anggotanya, sehingga larik KOSONG tidak
 * diperiksa sama sekali dan lolos. Perilaku itu dipertahankan — z.array()
 * tanpa .min() juga menerima larik kosong.
 */
export const searchSalesReturnSchema = z.object({
  date: required(ErrorList["Parameter error"]),
  sales_invoice: z.array(
    z.object({
      product_id: requiredInt(
        ErrorList["Item ID required"],
        ErrorList["Item ID must be numeric"],
        1
      ),
      quantity: z
        .number({
          error: (iss) =>
            iss.input === undefined || iss.input === null || iss.input === ""
              ? ErrorList["Quantity is required"]
              : ErrorList["Quantity must be numeric"],
        })
        .min(0.01, ErrorList["Quantity must be numeric"]),
    }),
    { error: ErrorList["Sales invoice item must be an array"] }
  ),
});

/**
 * POST /sales-invoice
 *
 * PERUBAHAN PERILAKU YANG DISENGAJA — pesan untuk `delivery` dan `service`.
 *
 * Rantai lama memasang pesan yang salah pada kedua bidang itu:
 *
 *   body("delivery").notEmpty().withMessage(ErrorList["Discount required"])
 *   body("service").notEmpty().withMessage(ErrorList["Discount required"])
 *
 * Ketiganya — discount, delivery, service — memakai kalimat yang sama, hasil
 * salin-tempel. Selama pesannya masih berupa kalimat Indonesia, akibatnya
 * "hanya" membingungkan: pengguna yang lupa mengisi ongkos kirim diberi tahu
 * bahwa diskonnya kosong.
 *
 * Setelah ErrorList berisi key i18n, kesalahannya menjadi lebih tajam: galat
 * pada kolom Pengiriman mengirim key `validation.discount.required`, sehingga
 * frontend tidak punya cara membedakan bidang mana yang bermasalah. Karena itu
 * dipakai key yang benar, dan dua key numerik baru ditambahkan ke ErrorList
 * karena sebelumnya memang belum ada padanannya.
 *
 * Statusnya tetap 400; hanya key-nya yang berubah.
 */
export const createInvoiceSchema = z.object({
  uuid: required(ErrorList["Parameter error"]),
  customer_id: present(ErrorList["Customer ID is required"]),
  discount: desimalTakNegatif(
    ErrorList["Discount required"],
    ErrorList["Discount must be numeric"]
  ),
  delivery: desimalTakNegatif(
    ErrorList["Delivery required"],
    ErrorList["Delivery must be numeric"]
  ),
  service: desimalTakNegatif(
    ErrorList["Service required"],
    ErrorList["Service must be numeric"]
  ),
  service_type: jenisJasa,
  is_paid: z.boolean({ error: ErrorList["Payment status is required"] }),
});

/**
 * Skema POST /sales-invoice berikut aturan silang biaya-jasa ↔ jenis-jasa.
 * Aturannya tinggal di common.schema.ts karena setoran memakai yang sama.
 */
export const createInvoiceSchemaWithRules =
  createInvoiceSchema.superRefine(aturanJasa);

/**
 * Parameter `:id` pada GET /payment/:id, GET /:id, dan DELETE /:id.
 *
 * Ketiganya memakai rantai yang sama persis, jadi satu skema dipakai bersama.
 * Nilai pada req.params selalu teks, sehingga dipakai varian yang menerima
 * teks — kebijakan ketat hanya berlaku pada req.body.
 */
export const paramInvoiceSchema = z.object({
  id: z
    .any()
    .superRefine((nilai, ctx) => {
      if (nilai === undefined || nilai === null || nilai === "") {
        ctx.addIssue({ code: "custom", message: ErrorList["ID is required"] });
        return;
      }
      const angka = Number(nilai);
      if (!Number.isInteger(angka) || angka < 0) {
        ctx.addIssue({
          code: "custom",
          message: ErrorList["ID must be numeric"],
        });
      }
    })
    .transform((nilai) => Number(nilai)),
});

export type InvoiceArchive = z.infer<typeof invoiceArchiveSchema>;
export type CreateInvoice = z.infer<typeof createInvoiceSchemaWithRules>;
export type SearchSalesReturn = z.infer<typeof searchSalesReturnSchema>;
