import { Router } from "express";
import { body, param, query } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { ReceivableRepository } from "../../repositories/receivable.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { redisClient } from "../../helper/redis.helper";
import { SalesmanController } from "../../controller/sales.controller";
import { StockRepository } from "../../repositories/stock.repository";
import { StockOutRepository } from "../../repositories/stock-out.repository";
import { SalesInvoicePaymentRepository } from "../../repositories/sales-invoice-payment.repository";
import { SalesReturnRepository } from "../../repositories/sales-return.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";

const router = Router();

const salesInvoiceController = new SalesInvoiceController(
  new SalesInvoiceRepository(prisma),
  new ReceivableRepository(redisClient, prisma),
  new SalesReturnRepository(prisma),
  new StockOutRepository(prisma),
  new StockRepository(prisma),
  new SalesInvoicePaymentRepository(prisma),
  new StockCardRepository(prisma)
);

const salesmanController = new SalesmanController(redisClient);

router.get("/archives", salesInvoiceController.fetchAnnualArchives);
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
  body("isPaid").exists().withMessage(ErrorList["Parameter error"]),
  body("isUnpaid").exists().withMessage(ErrorList["Parameter error"]),
  body("isActive").exists().withMessage(ErrorList["Parameter error"]),
  body("isDelete").exists().withMessage(ErrorList["Parameter error"]),
  body("isPaid").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isUnpaid").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isActive").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isDelete").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("sortBy").notEmpty().withMessage(ErrorList["Sort by required"]),
  body("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(
      ErrorList["Sort direction only supports ascending or descending"]
    ),
  ErrorHelper.intercept,
  salesInvoiceController.fetchArchives
);

router.post(
  "/search",
  body("customers").isArray().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  salesInvoiceController.search
);

router.post(
  "/sales-return",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("sales_invoice")
    .isArray()
    .withMessage(ErrorList["Sales invoice item must be an array"]),
  body("sales_invoice.*.product_id")
    .notEmpty()
    .withMessage(ErrorList["Item ID required"]),
  body("sales_invoice.*.product_id")
    .isInt({ min: 1 })
    .withMessage(ErrorList["Item ID must be numeric"]),
  body("sales_invoice.*.quantity")
    .notEmpty()
    .withMessage(ErrorList["Quantity is required"]),
  body("sales_invoice.*.quantity")
    .isFloat({ min: 0.01 })
    .withMessage(ErrorList["Quantity must be numeric"]),
  ErrorHelper.intercept,
  salesInvoiceController.searchSalesReturn
);

router.post(
  "/",
  body("uuid").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("customer_id")
    .exists()
    .withMessage(ErrorList["Customer ID is required"]),
  body("discount").notEmpty().withMessage(ErrorList["Discount required"]),
  body("discount")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Discount must be numeric"]),
  body("delivery").notEmpty().withMessage(ErrorList["Discount required"]),
  body("delivery")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Discount must be numeric"]),
  body("service").notEmpty().withMessage(ErrorList["Discount required"]),
  body("service")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Discount must be numeric"]),
  body("is_paid")
    .isBoolean()
    .withMessage(ErrorList["Payment status is required"]),
  ErrorHelper.intercept,
  salesmanController.createSalesman,
  salesInvoiceController.create
);

router.get(
  "/payment/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  salesInvoiceController.fetchPayments
);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  salesInvoiceController.fetchByID
);

router.delete(
  "/payment/:id",
  administratorMiddleware,
  SalesInvoiceController.deletePaymentByID
);

router.delete(
  "/:id",
  administratorMiddleware,
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  salesInvoiceController.delete
  // SalesInvoiceController.deleteByID
);

export default router;
