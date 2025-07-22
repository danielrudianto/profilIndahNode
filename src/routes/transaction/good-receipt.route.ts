import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import GoodReceiptController from "../../controller/good-receipt.controller";
import ErrorHelper from "../../helper/error.helper";
import { putriForbiddenMiddleware } from "../../helper/auth.helper";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";
import { prisma } from "../../helper/database.helper";
import { StockInRepository } from "../../repositories/stock-in.repository";
import { StockRepository } from "../../repositories/stock.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";

const router = Router();

const goodReceiptController = new GoodReceiptController(
  new GoodReceiptRepository(prisma),
  new StockInRepository(prisma),
  new StockRepository(prisma),
  new StockCardRepository(prisma)
);

router.get("/archives", goodReceiptController.fetchAnnualArchives);
router.post(
  "/archives",
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({ min: 2000 })
    .withMessage(ErrorList["Year must be numeric"]),
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(ErrorList["Month must be numeric"]),
  body("isActive").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isDelete").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isPending").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("sortBy").notEmpty().withMessage(ErrorList["Sort by required"]),
  body("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(
      ErrorList["Sort direction only supports ascending or descending"]
    ),
  ErrorHelper.intercept,
  goodReceiptController.fetchArchives
);

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

router.get("/unconfirmed", goodReceiptController.fetchUnconfirmed);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  goodReceiptController.fetchByID
);

router.put(
  "/confirm",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
  body("name").notEmpty().withMessage(ErrorList["Name required"]),
  body("invoice_name")
    .notEmpty()
    .withMessage(ErrorList["Invoice name required"]),
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("faktur").exists().withMessage(ErrorList["Tax invoice required"]),
  body("good_receipt")
    .isArray()
    .withMessage(ErrorList["Good receipt must be array"]),
  body("good_receipt.*.id")
    .notEmpty()
    .withMessage(ErrorList["Good receipt ID required"]),
  body("good_receipt.*.price")
    .notEmpty()
    .withMessage(ErrorList["Price is required"]),
  body("good_receipt.*.price")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Price must be numeric"]),
  body("good_receipt.*.discount")
    .notEmpty()
    .withMessage(ErrorList["Discount required"]),
  body("good_receipt.*.discount")
    .isFloat({ min: 0 })
    .withMessage(ErrorList["Discount must be numeric"]),
  ErrorHelper.intercept,
  goodReceiptController.confirm
);

router.put(
  "/reject",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  goodReceiptController.reject
);

export default router;
