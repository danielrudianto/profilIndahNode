import { Router, Request, Response } from "express";
import { authMiddleware } from "../helper/auth.helper";
import { body, validationResult } from "express-validator";
import AuthController from "../controller/auth.controller";

const router = Router();

router.post(
  "/login",
  body("username").not().isEmpty(),
  body("password").not().isEmpty(),
  AuthController.login
);

router.get("/", authMiddleware, (req, res, next) => {
  res.status(200).send({
    status: "authorized",
  });
});

router.post(
  "/token",
  authMiddleware,
  body("token").not().isEmpty(),
  AuthController.saveToken
);

router.post("/refreshToken", AuthController.refreshToken);

router.put(
  "/password",
  authMiddleware,
  body("password").not().isEmpty(),
  AuthController.updatePassword
);

router.put("/resetPassword", authMiddleware, AuthController.resetPassword);

export default router;
