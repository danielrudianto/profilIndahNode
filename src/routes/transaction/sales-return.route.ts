import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import SalesReturnController from "../../controller/sales-return.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../../repositories/sales-return.repository";
import { StockOutRepository } from "../../repositories/stock-out.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";
import { ProductStockRepository } from "../../repositories/product-stock.repository";

const router = Router();

const salesReturnController = new SalesReturnController(
  new SalesReturnRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new ProductStockRepository(prisma),
  new StockOutRepository(prisma),
  new StockCardRepository(prisma)
);

router.get("/archives", salesReturnController.fetchAnnualArchives);
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
  body("isActive").exists().withMessage(ErrorList["Parameter error"]),
  body("isDelete").exists().withMessage(ErrorList["Parameter error"]),
  body("isActive").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isDelete").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("sortBy").notEmpty().withMessage(ErrorList["Sort by required"]),
  body("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(
      ErrorList["Sort direction only supports ascending or descending"]
    ),
  ErrorHelper.intercept,
  salesReturnController.fetchArchives
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

router.delete(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  administratorMiddleware,
  salesReturnController.deleteByID
);

export default router;
