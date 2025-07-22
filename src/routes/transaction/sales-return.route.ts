import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import SalesReturnController from "../../controller/sales-return.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../../repositories/sales-return.repository";
import { StockRepository } from "../../repositories/stock.repository";

const router = Router();

const salesReturnController = new SalesReturnController(
  new SalesReturnRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new StockRepository(prisma)
);

router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("payment_method_id")
    .notEmpty()
    .withMessage(ErrorList["Payment method required"]),
  body("payment_method_id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Payment method must be numeric"]),
  body("sales_return")
    .isArray()
    .withMessage(ErrorList["Sales return items required"]),
  body("sales_return.*.sales_invoice_id")
    .notEmpty()
    .withMessage(ErrorList["Sales invoice ID is required"]),
  body("sales_return.*.sales_invoice_id")
    .isInt({
      min: 1,
    })
    .withMessage(ErrorList["Sales invoice ID must be numeric"]),
  body("sales_return.*.quantity")
    .notEmpty()
    .withMessage(ErrorList["Quantity is required"]),
  body("sales_return.*.quantity")
    .isFloat({
      min: 0.01,
    })
    .withMessage(ErrorList["Quantity must be numeric"]),
  ErrorHelper.intercept,
  salesReturnController.create
);

router.get("/archives", salesReturnController.fetchAnnualArchives);

router.post(
  "/archives",
  param("year").isNumeric().withMessage(ErrorList["Year is required"]),
  param("year")
    .isInt({ min: 2000 })
    .withMessage(ErrorList["Year must be numeric"]),
  param("month").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  salesReturnController.fetchArchives
);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  salesReturnController.fetchByID
);

// router.get(
//   "/code/:id",
//   param("id").notEmpty().withMessage(ErrorList["ID is required"]),
//   param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
//   ErrorHelper.intercept,
//   SalesReturnController.fetchCodeByID
// );

// router.delete(
//   "/:id",
//   param("id").notEmpty().withMessage(ErrorList["ID is required"]),
//   param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
//   ErrorHelper.intercept,
//   administratorMiddleware,
//   SalesReturnController.deleteByID
// );

export default router;
