import { z } from "zod";
import ErrorList from "../constants/error-list.constant";

/**
 * Penyaring GET /audit-logs.
 *
 * Seluruh bidangnya opsional: halaman aktivitas dibuka tanpa penyaring apa pun
 * lebih dulu, lalu pengguna mempersempitnya.
 *
 * Sumbernya req.query, jadi seluruh nilainya berupa teks dan kebijakan ketat
 * pada req.body tidak berlaku di sini — lihat catatan di common.schema.ts.
 */

/** Halaman minimal 1; nilai yang tidak masuk akal dikembalikan ke 1. */
const halaman = z.coerce
  .number({ error: ErrorList["Parameter error"] })
  .int(ErrorList["Parameter error"])
  .min(1, ErrorList["Parameter error"])
  .optional();

/*
  Batas atas 100 baris per halaman ditetapkan di sini, bukan dipercayakan pada
  frontend. Tanpa batas, satu permintaan dengan page_size besar bisa menarik
  seluruh isi tabel jejak — tabel yang justru dirancang tumbuh terus.
*/
const ukuranHalaman = z.coerce
  .number({ error: ErrorList["Parameter error"] })
  .int(ErrorList["Parameter error"])
  .min(1, ErrorList["Parameter error"])
  .max(100, ErrorList["Parameter error"])
  .optional();

/** Tanggal tanpa zona waktu, dibandingkan sebagai tanggal lokal. */
const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, ErrorList["Parameter error"])
  .optional();

/*
  userID boleh dikirim berulang (?userID=1&userID=2). Express menyusun
  parameter berulang menjadi larik, tetapi satu nilai tetap datang sebagai teks
  tunggal — keduanya harus diterima, dan bentuk tunggal dibungkus menjadi larik
  supaya lapisan berikutnya tidak perlu membedakannya.
*/
const daftarPengguna = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((nilai) => {
    if (nilai === undefined) return undefined;
    const daftar = Array.isArray(nilai) ? nilai : [nilai];
    return daftar.map((x) => Number(x));
  })
  .refine(
    (daftar) =>
      daftar === undefined ||
      daftar.every((x) => Number.isInteger(x) && x >= 1),
    { message: ErrorList["Parameter error"] }
  );

/*
  Menyembunyikan jejak tanpa pemilik. Nilainya datang sebagai teks dari query,
  jadi "true"/"1" diterima keduanya; apa pun selain itu berarti tidak menyaring.
*/
const bendera = z
  .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
  .optional()
  .transform((nilai) => nilai === "true" || nilai === "1");

export const queryAuditLogSchema = z.object({
  page: halaman,
  page_size: ukuranHalaman,
  entity: z.string().max(64, ErrorList["Parameter error"]).optional(),
  entityID: z
    .string()
    .regex(/^[0-9]+$/, ErrorList["Parameter error"])
    .optional(),
  userID: daftarPengguna,
  dateFrom: tanggal,
  dateTo: tanggal,
  userOnly: bendera,
});

export type QueryAuditLog = z.infer<typeof queryAuditLogSchema>;
