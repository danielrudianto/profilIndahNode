import { Router } from "express";
import ProductStockController from "../controllers/product-stock.controller";
import { prisma } from "../utils/database.helper";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { ProductRepository } from "../repositories/product.repository";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { ProductStockCardController } from "../controllers/product-stock-card.controller";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";
import { validate } from "../utils/validate.helper";
import {
  inadequateStockSchema,
  paramStockSchema,
  problematicStockSchema,
  stockListQuerySchema,
  stockMutationSchema,
} from "../schemas/stock.schema";

const router = Router();

const productStockController = new ProductStockController(
  new ProductStockRepository(prisma),
  new ProductPackageRepository(prisma),
  new ProductRepository(prisma),
  new SalesDepositRepository(prisma)
);

const stockCardController = new ProductStockCardController(
  new ProductRepository(prisma),
  new StockCardRepository(prisma)
);

router.get(
  "/product/:id",
  validate(paramStockSchema, "params"),
  productStockController.fetchByProductID
);

router.get(
  "/package/:id",
  validate(paramStockSchema, "params"),
  productStockController.fetchByPackageID
);

/*
  Dua sumber diperiksa terpisah karena validate() menerima satu sumber saja.
  Urutannya harus params lebih dulu: rantai lama juga memasang aturan parameter
  sebelum aturan kueri, dan pesan yang dikirim ke pengguna adalah pesan pertama
  yang gagal.
*/
router.get(
  "/:id",
  validate(paramStockSchema, "params"),
  validate(stockListQuerySchema, "query"),
  stockCardController.fetchByID
);

router.get(
  "/",
  validate(stockListQuerySchema, "query"),
  productStockController.fetch
);

router.post(
  "/problematic",
  validate(problematicStockSchema),
  productStockController.fetchProblematic
);

router.post(
  "/inadequate",
  validate(inadequateStockSchema),
  productStockController.fetchInadequate
);

router.post(
  "/mutation",
  validate(stockMutationSchema),
  stockCardController.fetchMutation
);

/*
  POST / dihapus. Seluruh badan ProductStockController.create sudah dikomentari
  sejak era MongoDB, jadi handler-nya tidak pernah mengirim balasan sama sekali
  dan permintaan menggantung sampai timeout.
*/

export default router;
