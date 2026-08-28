import { Router } from "express";
import ReceivableController from "../controllers/receivable.controller";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { redisClient } from "../utils/redis.helper";
import { prisma } from "../utils/database.helper";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { validate } from "../utils/validate.helper";
import {
  createReceivablePaymentSchema,
  paramCustomerReceivableSchema,
} from "../schemas/receivable.schema";
import { paramId } from "../schemas/common.schema";

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

/* Sisa tagihan satu faktur — dibaca layar retur sebelum memilih perlakuan. */
router.get(
  "/invoice/:id",
  validate(paramId, "params"),
  receivableController.fetchInvoiceOutstanding
);

router.get(
  "/customer/:id",
  validate(paramCustomerReceivableSchema, "params"),
  receivableController.fetchByCustomerID
);

router.post(
  "/payment",
  validate(createReceivablePaymentSchema),
  receivableController.createPayment
);
/*
  DELETE /:id dihapus. Isi blok try handler-nya sudah dikomentari, jadi
  permintaan dengan id yang sah tidak pernah dibalas — hanya id tidak sah
  yang menerima 400.
*/

export default router;
