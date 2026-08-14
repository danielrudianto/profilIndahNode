import { Router } from "express";
import ReceivableController from "../../controllers/receivable.controller";
import { body, param } from "express-validator";
import ErrorList from "../../constants/error_list";
import ErrorHelper from "../../utils/error.helper";
import { ReceivableRepository } from "../../repositories/receivable.repository";
import { redisClient } from "../../utils/redis.helper";
import { prisma } from "../../utils/database.helper";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";

const router = Router();

const receivableController = new ReceivableController(
  new ReceivableRepository(redisClient, prisma),
  new SalesInvoiceRepository(prisma)
);

router.get("/", receivableController.fetch);

/*
  GET /history/:id dihapus. Handler-nya hanya berisi kode yang dikomentari
  sejak model lama, jadi permintaan tidak pernah dibalas.
*/

router.get(
  "/customer/:id",
  param("id").notEmpty().withMessage(ErrorList["Customer ID is required"]),
  param("id")
    .isInt({ min: 0 })
    .withMessage(ErrorList["CUstomer ID must be integer"]),
  ErrorHelper.intercept,
  receivableController.fetchByCustomerID
);

router.post(
  "/payment",
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("amount").notEmpty().withMessage(ErrorList["Amount is required"]),
  body("amount")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Amount must be numeric"]),
  body("full_payment")
    .isBoolean()
    .withMessage(ErrorList["Payment status required"]),
  body("payment_method_id")
    .exists()
    .withMessage(ErrorList["Payment method required"]),
  ErrorHelper.intercept,
  receivableController.createPayment
);
/*
  DELETE /:id dihapus. Isi blok try handler-nya sudah dikomentari, jadi
  permintaan dengan id yang sah tidak pernah dibalas — hanya id tidak sah
  yang menerima 400.
*/

export default router;
