import { Router } from "express";
import { body } from "express-validator";
import ErrorHelper from "../../helper/error.helper";
import ErrorList from "../../assets/error_list";
import ProductStockController from "../../controller/product-stock.controller";
import { ProductStockRepository } from "../../repositories/product-stock.repository";
import { prisma } from "../../helper/database.helper";
import { ProductPackageRepository } from "../../repositories/product-package.repository";
import { ProductRepository } from "../../repositories/product.repository";

const router = Router();

const productStockController = new ProductStockController(
  new ProductStockRepository(prisma),
  new ProductPackageRepository(prisma),
  new ProductRepository(prisma)
);

router.post(
  "/product-stock",
  body("keyword").exists().withMessage(ErrorList["Keyword is required"]),
  body("page").notEmpty().withMessage(ErrorList["Page is required"]),
  body("page")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Page must be numeric"]),
  ErrorHelper.intercept,
  productStockController.fetchWarehouse
);

export default router;
