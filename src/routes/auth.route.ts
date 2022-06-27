import { PrismaClient } from "@prisma/client";
import { Router, Request, Response } from "express";
import { sign } from "jsonwebtoken";
import { authMiddleware } from "../helper/auth.helper";
import { body, validationResult } from "express-validator";
import { compare } from "bcrypt";
import AuthController from "../controller/auth.controller";

const prisma = new PrismaClient();
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

export default router;
