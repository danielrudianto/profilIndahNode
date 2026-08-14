import { Router } from "express";
import { authMiddleware } from "../utils/auth.helper";
import AuthController from "../controllers/auth.controller";
import { UserRepository } from "../repositories/user.repository";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { masukSchema, ubahSandiSchema } from "../schemas/auth.schema";

const router = Router();
const authController = new AuthController(new UserRepository(prisma));

router.post("/login", validate(masukSchema), authController.login);

router.post("/refresh-token", authController.refreshToken);

/*
  authMiddleware harus tetap berjalan SEBELUM validate(): ia menulis userId ke
  req.body, dan controller memakainya untuk menentukan sandi siapa yang
  diubah.
*/
router.put(
  "/password",
  authMiddleware,
  validate(ubahSandiSchema),
  authController.updatePassword
);

router.put("/reset-password", authMiddleware, authController.updatePassword);

export default router;
