import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { body } from "express-validator";
import GoodReceiptController from "../controller/good_receipt.controller";

const prisma = new PrismaClient();
const router = Router();

router.post(
  "/",
  body("date").not().isEmpty().withMessage("Tanggal wajib diisi."),
  body("name").not().isEmpty().withMessage("Nama dokumen wajib diisi."),
  body("company_id").not().isEmpty().withMessage("Perusahaan wajib diisi."),
  body("supplier_id").not().isEmpty().withMessage("Supplier wajib diisi."),
  body("purchase_invoice_name")
    .not()
    .isEmpty()
    .withMessage("Nama dokumen pembelian wajib diisi."),
  body("discount")
    .not()
    .isEmpty()
    .withMessage("Nominal potongan harga pembelian wajib diisi."),
  body("discount")
    .isNumeric()
    .withMessage("Nominal potongan harga pembelian wajib diisi."),
  GoodReceiptController.create
);

router.get("/archives", GoodReceiptController.fetchArchive);
router.get("/archives/:year", GoodReceiptController.fetchArchive);
router.get("/archives/:year/:month", GoodReceiptController.fetchArchive);

router.get("/:id", GoodReceiptController.fetchById);

export default router;
