import { Router } from "express";
import { SalesDepositController } from "../controllers/sales-deposit.controller";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { redisClient } from "../utils/redis.helper";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import {
  archiveSalesDepositSchema,
  confirmSalesDepositSchema,
  createSalesDepositSchema,
  paramSalesDepositSchema,
  rejectSalesDepositSchema,
} from "../schemas/sales-deposit.schema";

const router = Router();

const salesDepositController = new SalesDepositController(
  new SalesDepositRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new StockCardRepository(prisma),
  new ProductStockRepository(prisma),
  new StockOutRepository(prisma),
  new ReceivableRepository(redisClient, prisma),
  new OverpaymentRepository(prisma)
);

router.get("/archives", salesDepositController.fetchAnnualArchives);

router.post(
  "/archives",
  validate(archiveSalesDepositSchema),
  salesDepositController.fetchArchives
);

router.post(
  "/confirm",
  validate(confirmSalesDepositSchema),
  salesDepositController.confirm
);

router.post(
  "/reject",
  validate(rejectSalesDepositSchema),
  salesDepositController.reject
);

router.post(
  "/",
  validate(createSalesDepositSchema),
  salesDepositController.create
);

router.get(
  "/:id",
  validate(paramSalesDepositSchema, "params"),
  salesDepositController.fetchByID
);

router.get("/", salesDepositController.fetch);

export default router;
