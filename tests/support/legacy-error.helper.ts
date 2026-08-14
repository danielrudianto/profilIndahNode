/**
 * Penangkap galat express-validator, sebagaimana adanya sebelum migrasi Zod.
 *
 * Sudah tidak dipakai kode produksi mana pun: seluruh route memakai validate()
 * dari src/utils/validate.helper.ts. Berkas ini tetap disimpan karena tes
 * differential membangun ulang rantai validator lama untuk dibandingkan
 * berdampingan dengan skema baru, dan perbandingan itu butuh penangkap yang
 * PERSIS sama. Letaknya di tests/ supaya jelas ia perkakas uji, bukan kode
 * yang ikut terkirim ke produksi.
 */
import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

class ErrorHelper {
  static intercept = (req: Request, res: Response, next: NextFunction) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
      return res.status(400).send(validation_result.array()[0].msg);
    } else {
      next();
    }
  };
}

export default ErrorHelper;
