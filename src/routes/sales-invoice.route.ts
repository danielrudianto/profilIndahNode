import { Router } from "express";
import { prisma } from "../utils/database.helper";
import SalesInvoiceController from "../controllers/sales-invoice.controller";
import { administratorMiddleware } from "../utils/auth.helper";
import { validate } from "../utils/validate.helper";
import { ReceivableRepository } from "../repositories/receivable.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { redisClient } from "../utils/redis.helper";
import { SalesmanController } from "../controllers/sales.controller";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import {
  invoiceArchiveSchema,
  createInvoiceSchema,
  searchSalesReturnSchema,
  paramInvoiceSchema,
} from "../schemas/sales-invoice.schema";

const router = Router();

const salesInvoiceController = new SalesInvoiceController(
  new SalesInvoiceRepository(prisma),
  new ReceivableRepository(redisClient, prisma),
  new SalesReturnRepository(prisma),
  new StockOutRepository(prisma),
  new ProductStockRepository(prisma),
  new SalesInvoicePaymentRepository(prisma),
  new StockCardRepository(prisma)
);

const salesmanController = new SalesmanController(redisClient);

router.get("/archives", salesInvoiceController.fetchAnnualArchives);

router.post(
  "/archives",
  validate(invoiceArchiveSchema),
  salesInvoiceController.fetchArchives
);

router.post(
  "/sales-return",
  validate(searchSalesReturnSchema),
  salesInvoiceController.searchSalesReturn
);

/*
  createSalesman berjalan sebagai middleware di sini: ia membaca req.body.sales
  dan meneruskan permintaan lewat next(). Urutannya harus tetap setelah
  validate() supaya badan yang cacat ditolak sebelum menyentuh Redis.
*/
router.post(
  "/",
  validate(createInvoiceSchema),
  salesmanController.createSalesman,
  salesInvoiceController.create
);

router.get(
  "/payment/:id",
  validate(paramInvoiceSchema, "params"),
  salesInvoiceController.fetchPayments
);

router.get(
  "/:id",
  validate(paramInvoiceSchema, "params"),
  salesInvoiceController.fetchByID
);

router.delete(
  "/:id",
  administratorMiddleware,
  validate(paramInvoiceSchema, "params"),
  salesInvoiceController.delete
);

export default router;
