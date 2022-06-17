import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";
import { Router } from "express";
import AuthController from "../controller/auth.controller";
import UserController from "../controller/user.controller";

const prisma = new PrismaClient()
const router = Router();

router.get("/roles", AuthController.getRoles);
router.get("/:id", UserController.getById)
router.get("/", UserController.get);
router.post("/", UserController.create);
router.put("/", UserController.update);
router.put("/status", UserController.toggleActive);

export default router;