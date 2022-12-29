import { Router } from "express";
import { body, param } from "express-validator";
import BillController from "../controller/bill.controller";
import { administratorMiddleware } from "../helper/auth.helper";
const router = Router();
router.post("/printout/draft", body("items").isArray().withMessage("Mohon isikan barang."), BillController.createPrintoutDraft);
router.post("/printout", BillController.createPrintout);
router.post("/", body("customer_id").exists().withMessage("Mohon isikan ID pelanggan."), body("payment_method_id")
    .exists()
    .withMessage("Mohon isikan metode pembayaran."), body("discount")
    .toInt()
    .isInt({ min: 0 })
    .withMessage("Mohon isikan nilai potongan harga."), body("delivery")
    .toInt()
    .isInt({ min: 0 })
    .withMessage("Mohon isikan nilai pengiriman barang."), body("service")
    .toInt()
    .isInt({ min: 0 })
    .withMessage("Mohon isikan nilai jasa."), BillController.create);
router.get("/archives", BillController.fetchArchive);
router.get("/archives/:year", param("year").exists().withMessage("Mohon isikan tahun arsip."), BillController.fetchArchive);
router.get("/archives/:year/:month", param("year").exists().withMessage("Mohon isikan tahun arsip."), param("month").exists().withMessage("Mohon isikan bulan arsip."), BillController.fetchArchive);
router.get("/code/:id", param("id").notEmpty().withMessage("Mohon isikan ID bill."), BillController.fetchCodeById);
router.get("/search", BillController.searchArchive);
router.get("/:id", param("id").notEmpty().withMessage("Mohon isikan ID bill."), BillController.fetchById);
router.delete("/:id", administratorMiddleware, BillController.deleteById);
export default router;
