import { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";

/**
 * Menjalankan skema Zod terhadap satu bagian permintaan.
 *
 * Bentuk balasan galat mengikuti ErrorHelper.intercept yang dulu
 * dipakai express-validator: status 400 dengan badan berupa string mentah
 * berisi pesan pertama yang gagal — bukan JSON. Frontend menampilkan
 * `error.error` apa adanya, jadi mengubah bentuknya akan mengubah tampilan di
 * layar pengguna.
 *
 * Isi permintaan SENGAJA tidak diganti dengan hasil parse. `req.body` juga
 * menampung `userId` dan `role` yang ditulis middleware autentikasi; kalau
 * badan permintaan ditimpa hasil parse, keduanya ikut terhapus dan controller
 * kehilangan identitas pemanggil tanpa galat apa pun.
 *
 * Urutan bidang di dalam skema menentukan pesan mana yang muncul lebih dulu,
 * sama seperti urutan rantai validator sebelumnya. Kalau urutannya diubah,
 * pesan yang dilihat pengguna ikut berubah.
 */
export const validate =
  (schema: ZodType, sumber: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const hasil = schema.safeParse(req[sumber]);

    if (!hasil.success) {
      return res.status(400).send(hasil.error.issues[0].message);
    }

    return next();
  };
