import { Router } from "express";
import { authMiddleware } from "../../helper/auth.helper";
import { body } from "express-validator";
import AuthController from "../../controller/auth.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post(
  "/login",
  body("username").not().isEmpty().withMessage("Mohon isikan username."),
  body("password").not().isEmpty().withMessage("Mohon isikan password."),
  ErrorHelper.intercept,
  AuthController.login
);

router.post("/refresh-token", AuthController.refreshToken);

router.put(
  "/password",
  authMiddleware,
  body("password").not().isEmpty(),
  ErrorHelper.intercept,
  AuthController.updatePassword
);

router.put("/reset-password", authMiddleware, AuthController.resetPassword);

export default router;
