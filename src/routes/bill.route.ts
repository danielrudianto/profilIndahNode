import { PrismaClient } from "@prisma/client";
import { Router } from "express";

const prisma = new PrismaClient();
const router = Router();

router.post("/", (req, res, next) => {});

router.get("/", (req, res, next) => {});

export default router;
