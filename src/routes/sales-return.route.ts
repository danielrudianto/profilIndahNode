import { Router } from "express";
import { prisma } from "../utils/database.helper";
import SalesReturnController from "../controllers/sales-return.controller";
import { administratorMiddleware } from "../utils/auth.helper";
import { validate } from "../utils/validate.helper";
import {
  archiveSalesReturnSchema,
  createSalesReturnSchema,
  paramSalesReturnSchema,
} from "../schemas/sales-return.schema";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";

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
  validate(archiveSalesReturnSchema),
  salesReturnController.fetchArchives
);

router.post(
  "/",
  validate(createSalesReturnSchema),
  salesReturnController.create
);

router.get(
  "/:id",
  validate(paramSalesReturnSchema, "params"),
  salesReturnController.fetchByID
);

// router.get(
//   "/code/:id",
//   validate(paramSalesReturnSchema, "params"),
//   SalesReturnController.fetchCodeByID
// );

/*
  Urutan middleware dipertahankan apa adanya: pemeriksaan parameter berjalan
  lebih dulu, baru administratorMiddleware. Menukarnya akan mengubah balasan
  untuk permintaan yang sekaligus cacat dan tidak berwenang.
*/
router.delete(
  "/:id",
  validate(paramSalesReturnSchema, "params"),
  administratorMiddleware,
  salesReturnController.deleteByID
);

export default router;
