import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import BillController from "../controller/bill.controller";

const prisma = new PrismaClient();
const router = Router();

router.post("/", BillController.create);

router.get("/", (req, res, next) => {});

export default router;
