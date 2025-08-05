import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import { SalesDepositController } from "../../controller/sales-deposit.controller";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { redisClient } from "../../helper/redis.helper";
import { OverpaymentRepository } from "../../repositories/overpayment.repository";
import { ReceivableRepository } from "../../repositories/receivable.repository";
import { SalesDepositRepository } from "../../repositories/sales-deposit.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";
import { StockOutRepository } from "../../repositories/stock-out.repository";
import { StockRepository } from "../../repositories/stock.repository";

const router = Router();

const salesDepositController = new SalesDepositController(
  new SalesDepositRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new StockCardRepository(prisma),
  new StockRepository(prisma),
  new StockOutRepository(prisma),
  new ReceivableRepository(redisClient, prisma),
  new OverpaymentRepository(prisma)
);

router.get("/archives", salesDepositController.fetchAnnualArchives);
router.post("/archives", salesDepositController.fetchArchives);

router.post(
  "/confirm",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["ID must be numeric"]),
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("sales_invoice_payment")
    .notEmpty()
    .withMessage(ErrorList["Payment is required"]),
  body("sales_invoice_payment")
    .isArray()
    .withMessage(ErrorList["Payment must be an array"]),
  body("sales_invoice_payment.*.payment_method_id")
    .exists()
    .withMessage(ErrorList["Payment method required"]),
  body("sales_invoice_payment.*.value")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Amount must be numeric"]),
  body("sales_invoice_payment.*.date")
    .notEmpty()
    .withMessage(ErrorList["Payment date is required"]),
  ErrorHelper.intercept,
  salesDepositController.confirm
);
router.post(
  "/reject",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id").isInt({ min: 0 }).withMessage(ErrorList["ID must be numeric"]),
  body("payment_method")
    .notEmpty()
    .withMessage(ErrorList["Payment method required"]),
  body("payment_method")
    .isIn(["create", "delete"])
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  salesDepositController.reject
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
  body("type")
    .isIn(["INTERNAL", "EXTERNAL"])
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  salesDepositController.create
);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  salesDepositController.fetchByID
);

router.get("/", salesDepositController.fetch);

export default router;
