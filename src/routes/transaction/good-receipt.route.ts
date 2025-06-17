import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import GoodReceiptController from "../../controller/good-receipt.controller";
import ErrorHelper from "../../helper/error.helper";
import { putriForbiddenMiddleware } from "../../helper/auth.helper";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";
import { prisma } from "../../helper/database.helper";
import { PurchaseInvoiceRepository } from "../../repositories/purchase-invoice.repository";
import { StockInRepository } from "../../repositories/stock-in.repository";

const router = Router();

const goodReceiptController = new GoodReceiptController(
  new GoodReceiptRepository(prisma),
  new PurchaseInvoiceRepository(prisma),
  new StockInRepository(prisma)
);

// router.post("/search", GoodReceiptController.search);
router.post(
  "/check",
  body("name").exists().withMessage(ErrorList["Name required"]),
  ErrorHelper.intercept,
  goodReceiptController.check
);

router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("company_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("supplier_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  putriForbiddenMiddleware,
  goodReceiptController.create
);

router.get("/archives", goodReceiptController.fetchAnnualArchives);
router.get(
  "/archives/:year",
  param("year").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("year").isInt({ min: 2000 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  goodReceiptController.fetchMonthlyArchives
);
router.post(
  "/archives/:year/:month",
  param("year").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("year").isInt({ min: 2000 }).withMessage(ErrorList["Parameter error"]),
  param("month").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  goodReceiptController.fetchArchives
);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  goodReceiptController.fetchByID
);

export default router;
