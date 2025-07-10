import { Router } from "express";
import { param } from "express-validator";
import ErrorList from "../../assets/error_list";
import { ProductSalesPriceController } from "../../controller/product-price-sales.controller";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { ProductRepository } from "../../repositories/product.repository";

const router = Router();

const productSalesPriceController = new ProductSalesPriceController(
  new ProductRepository(prisma)
);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["ID is required"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
  ErrorHelper.intercept,
  productSalesPriceController.fetchByID
);
router.get("/", productSalesPriceController.fetch);

router.post("/format", ProductSalesPriceController.fetchFormat);
router.post("/bulk", ProductSalesPriceController.createBulk);

router.put("/v2", ProductSalesPriceController.updateByIDV2);
router.put("/", ProductSalesPriceController.updateByID);

export default router;
