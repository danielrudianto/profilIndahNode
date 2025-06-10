import { Router } from "express";
import { param } from "express-validator";
import { prisma } from "../../helper/database.helper";
import ErrorList from "../../assets/error_list";
import { ProductTypeController } from "../../controller/product-type.controller";
import ErrorHelper from "../../helper/error.helper";
import { ProductTypeRepository } from "../../repositories/product-type.repository";

const router = Router();

const productTypeController = new ProductTypeController(
  new ProductTypeRepository(prisma)
);

router.get("/autocomplete", productTypeController.fetchAutocomplete);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productTypeController.fetchByID
);
router.get("/", productTypeController.fetch);
router.post("/", productTypeController.create);
router.put("/", productTypeController.update);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  productTypeController.delete
);

export default router;
