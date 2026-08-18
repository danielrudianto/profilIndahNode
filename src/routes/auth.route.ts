import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { UserRepository } from "../repositories/user.repository";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { loginSchema } from "../schemas/auth.schema";

const router = Router();
const authController = new AuthController(new UserRepository(prisma));

router.post("/login", validate(loginSchema), authController.login);

router.post("/refresh-token", authController.refreshToken);

export default router;
