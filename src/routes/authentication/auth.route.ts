import { Router } from "express";
import { authMiddleware } from "../../helper/auth.helper";
import { body, header } from "express-validator";
import AuthController from "../../controller/auth.controller";
import ErrorHelper from "../../helper/error.helper";
import ErrorList from "../../assets/error_list";

const router = Router();

router.post(
  "/login",
  body("username")
    .not()
    .isEmpty()
    .withMessage(ErrorList["Username is required"]),
  body("password").not().isEmpty().withMessage(ErrorList["Password required"]),
  ErrorHelper.intercept,
  AuthController.login
);

router.post(
  "/refresh-token",
  header("x-access-token")
    .notEmpty()
    .withMessage(ErrorList["Access token required"]),
  AuthController.refreshToken
);

router.put(
  "/password",
  authMiddleware,
  body("password").not().isEmpty(),
  ErrorHelper.intercept,
  AuthController.updatePassword
);

router.put("/reset-password", authMiddleware, AuthController.updatePassword);

export default router;
