import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { UserRepository } from "../repositories/user.repository";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { loginSchema } from "../schemas/auth.schema";
import {
  pembatasMasuk,
  pembatasSegarkanToken,
} from "../utils/rate-limit.helper";

const router = Router();
const authController = new AuthController(new UserRepository(prisma));

/*
  Pembatas dipasang SEBELUM validate.

  Kalau urutannya dibalik, permintaan yang bentuknya salah ditolak lebih dulu
  oleh validator dan tidak pernah sampai ke pembilang — penyerang tinggal
  menyisipkan badan yang cacat di antara tebakannya untuk menyegarkan jatah.
  Yang dibilang harus SETIAP percobaan, bukan hanya yang bentuknya benar.
*/
router.post(
  "/login",
  pembatasMasuk,
  validate(loginSchema),
  authController.login
);

router.post(
  "/refresh-token",
  pembatasSegarkanToken,
  authController.refreshToken
);

export default router;
