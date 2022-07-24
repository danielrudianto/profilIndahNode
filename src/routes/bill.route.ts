import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import BillController from "../controller/bill.controller";

const prisma = new PrismaClient();
const router = Router();

router.post("/", BillController.create);
router.get("/archives", BillController.fetchArchive);
router.get("/archives/:year", BillController.fetchArchive);
router.get("/archives/:year/:month", BillController.fetchArchive);

router.get("/code/:id", BillController.fetchCodeById);

export default router;
