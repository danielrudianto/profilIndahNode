import { z } from "zod";
import ErrorList from "../constants/error-list.constant";
import { requiredInt, requiredIntFromText } from "./common.schema";

/**
 * Kontrak API untuk domain laporan.
 *
 * Sebelumnya aturan yang sama ditulis ulang di dalam berkas route: pemeriksaan
 * bulan dan tahun saja muncul sebelas kali. Berkas route jadi 332 baris yang
 * sebagian besar isinya validasi, bukan routing.
 *
 * DUA VARIAN BULAN, JANGAN DISATUKAN.
 *
 * Sebagian endpoint mensyaratkan bulan 1-12, sebagian menerima 0. Nilai 0
 * bukan kesalahan — ia penanda "seluruh tahun", dan dibaca sebagai
 * `if (month > 0)` di dalam repository. Menyamakan semuanya ke 1-12 akan
 * mematikan laporan tahunan tanpa galat apa pun, karena permintaan dengan
 * month=0 langsung ditolak di lapisan validasi dan tidak pernah sampai ke
 * kode yang menanganinya.
 *
 *   periodeWajibBulan   month 1-12   /sales, /purchase, /output
 *   periodeBolehTahunan month 0-12   /profit-loss, /sales/*, /daily-sales,
 *                                    /purchase/download
 *
 * Nilai pada req.query selalu berupa teks, sedangkan pada req.body sudah
 * bertipe asli dari JSON. Karena itu varian query dipisah dan memakai
 * pemaksaan tipe.
 */

// Dua pesan per bidang, meniru rantai lama: notEmpty() lalu isInt().
const bulanKosong = ErrorList["Month is required"];
const bulanSalah = ErrorList["Month must be numeric"];
const tahunKosong = ErrorList["Year is required"];
const tahunSalah = ErrorList["Year must be numeric"];

/** Bulan 1-12. Tidak menerima penanda tahunan. */
const bulanWajib = requiredInt(bulanKosong, bulanSalah, 1, 12);

/** Bulan 0-12, dengan 0 berarti seluruh tahun. */
const bulanAtauTahun = requiredInt(bulanKosong, bulanSalah, 0, 12);

const tahun = requiredInt(tahunKosong, tahunSalah, 2000);

/** Versi untuk req.query, yang nilainya selalu teks. */
const bulanAtauTahunKueri = requiredIntFromText(bulanKosong, bulanSalah, 0, 12);
const tahunKueri = requiredIntFromText(tahunKosong, tahunSalah, 2000);

/** POST /report/sales, /report/purchase — bulan wajib 1-12. */
export const requiredMonthPeriodSchema = z.object({
  month: bulanWajib,
  year: tahun,
});

/** POST /report/profit-loss, /purchase/download, /sales/download. */
export const optionalMonthPeriodSchema = z.object({
  month: bulanAtauTahun,
  year: tahun,
});

/** GET /report/sales/brand, /sales/type, /sales/sales. */
export const queryPeriodSchema = z.object({
  month: bulanAtauTahunKueri,
  year: tahunKueri,
});

/**
 * POST /report/money-receipt dan /money-receipt/download.
 *
 * Rantai lama hanya memakai body("date").exists() — tanpa pemeriksaan bentuk
 * sama sekali. Perilaku itu dipertahankan supaya pesan yang dilihat pengguna
 * tidak berubah; pengetatan bentuk tanggal dibahas terpisah.
 */
export const dateSchema = z.object({
  date: z.any().refine((nilai) => nilai !== undefined, {
    message: ErrorList["Date required"],
  }),
});

/** POST /report/money-receipt/dor */
export const dateRangeSchema = z.object({
  startDate: z.any().refine((nilai) => nilai !== undefined, {
    message: ErrorList["Date required"],
  }),
  endDate: z.any().refine((nilai) => nilai !== undefined, {
    message: ErrorList["Date required"],
  }),
});

/** POST /report/output-company */
export const companyOutputSchema = z.object({
  date: z.any().refine((nilai) => nilai !== undefined && String(nilai) !== "", {
    message: ErrorList["Date required"],
  }),
  company_id: z
    .any()
    .refine((nilai) => nilai !== undefined && String(nilai) !== "", {
      message: ErrorList["Company ID required"],
    }),
});

/**
 * POST /report/output
 *
 * Urutan bidang mengikuti rantai lama: month, year, group, type, brand.
 */
export const outputSchema = z.object({
  month: bulanWajib,
  year: tahun,
  group: z.enum(["brand", "type"], {
    error: ErrorList["Invalid group report"],
  }),
  type: z.array(z.number().int(ErrorList["Type must be an integer"]), {
    error: ErrorList["Type must be an array"],
  }),
  brand: z.array(z.number().int(ErrorList["Type must be an integer"]), {
    error: ErrorList["Type must be an array"],
  }),
});

/**
 * POST /report/daily-sales
 *
 * Urutan bidang mengikuti rantai lama: day, month, year, group.
 * `day` menerima 0-31; nilai 0 dipakai sebagai penanda seluruh bulan.
 */
export const dailySalesSchema = z.object({
  day: requiredInt(
    ErrorList["Day is required"],
    ErrorList["Day must be numeric"],
    0,
    31
  ),
  month: bulanAtauTahun,
  year: tahun,
  group: z
    .any()
    .refine((nilai) => nilai !== undefined && String(nilai) !== "", {
      message: ErrorList["Parameter error"],
    }),
});
