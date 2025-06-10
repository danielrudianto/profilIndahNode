import { Router } from "express";
import { body, param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import { ProductUnitController } from "../../controller/product-unit.controller";
import ErrorHelper from "../../helper/error.helper";
import { ProductUnitRepository } from "../../repositories/product-unit.repository";

const router = Router();

const productUnitController = new ProductUnitController(
  new ProductUnitRepository(prisma)
);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productUnitController.fetch
);

router.post(
  "/",
  body("item_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("item_unit").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productUnitController.create
);

// router.get("/sales-price/:id", productUnitController.fetchByID);

export default router;
