import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import { SalesInvoicePaymentController } from "../../controller/sales-invoice-payment.controller";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { redisClient } from "../../helper/redis.helper";
import { ReceivableRepository } from "../../repositories/receivable.repository";
import { SalesInvoicePaymentRepository } from "../../repositories/sales-invoice-payment.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";

const router = Router();

const salesInvoicePaymentController = new SalesInvoicePaymentController(
  new SalesInvoicePaymentRepository(prisma),
  new ReceivableRepository(redisClient, prisma),
  new SalesInvoiceRepository(prisma)
);

router.post(
  "/",
  body("sales_invoice_code_id")
    .notEmpty()
    .withMessage(ErrorList["Sales invoice ID is required"]),
  body("sales_invoice_code_id")
    .isInt({ min: 0 })
    .withMessage(ErrorList["Sales invoice ID must be numeric"]),
  body("payment_method_id")
    .exists()
    .withMessage(ErrorList["Payment method required"]),
  body("value").notEmpty().withMessage(ErrorList["Amount is required"]),
  body("value")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Amount must be numeric"]),
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  ErrorHelper.intercept,
  salesInvoicePaymentController.create
);

export default router;
