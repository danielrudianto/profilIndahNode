import { Router } from "express";
import { authMiddleware } from "../../utils/auth.helper";
import { body } from "express-validator";
import AuthController from "../../controllers/auth.controller";
import ErrorHelper from "../../utils/error.helper";
import { UserRepository } from "../../repositories/user.repository";
import { prisma } from "../../utils/database.helper";
import ErrorList from "../../constants/error_list";

const router = Router();
const authController = new AuthController(new UserRepository(prisma));

router.post(
  "/login",
  body("username")
    .not()
    .isEmpty()
    .withMessage(ErrorList["Username is required"]),
  body("password")
    .not()
    .isEmpty()
    .withMessage(ErrorList["Password is required"]),
  ErrorHelper.intercept,
  authController.login
);

router.post("/refresh-token", authController.refreshToken);

router.put(
  "/password",
  authMiddleware,
  body("password").not().isEmpty(),
  ErrorHelper.intercept,
  authController.updatePassword
);

router.put("/reset-password", authMiddleware, authController.updatePassword);

export default router;
