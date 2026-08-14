import { Router } from "express";
import ProductStockController from "../controllers/product-stock.controller";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { prisma } from "../utils/database.helper";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { ProductRepository } from "../repositories/product.repository";
import { authMiddleware, authMiddlewareRole } from "../utils/auth.helper";
import { SalesDepositRepository } from "../repositories/sales-deposit.repository";
import { validate } from "../utils/validate.helper";
import {
  listInadequateWarehouseStockSchema,
  listWarehouseStockSchema,
} from "../schemas/warehouse.schema";

const router = Router();

const productStockController = new ProductStockController(
  new ProductStockRepository(prisma),
  new ProductPackageRepository(prisma),
  new ProductRepository(prisma),
  new SalesDepositRepository(prisma)
);

/*
  Kedua middleware autentikasi harus tetap berjalan SEBELUM validate(): keduanya
  menulis userId, role, dan user_sales ke req.body, dan controller memakainya
  untuk menentukan data siapa yang boleh dilihat. Bidang-bidang itu tidak ikut
  divalidasi karena berasal dari token, bukan dari klien.
*/
router.post(
  "/product-stock",
  authMiddlewareRole,
  validate(listWarehouseStockSchema),
  productStockController.fetchWarehouse
);

router.post(
  "/product-stock/inadequate",
  authMiddleware,
  validate(listInadequateWarehouseStockSchema),
  productStockController.fetchInadequateWarehouse
);

export default router;
