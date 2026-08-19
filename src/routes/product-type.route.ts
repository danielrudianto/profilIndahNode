import { Router } from "express";
import { prisma } from "../utils/database.helper";
import { ProductTypeController } from "../controllers/product-type.controller";
import { ProductTypeRepository } from "../repositories/product-type.repository";
import { validate } from "../utils/validate.helper";
import {
  createProductTypeSchema,
  paramProductTypeSchema,
  updateProductTypeSchema,
} from "../schemas/product-type.schema";

const router = Router();

const productTypeController = new ProductTypeController(
  new ProductTypeRepository(prisma)
);

router.get("/autocomplete", productTypeController.fetchAutocomplete);
router.get(
  "/:id/products",
  validate(paramProductTypeSchema, "params"),
  productTypeController.fetchProducts
);
router.get(
  "/:id",
  validate(paramProductTypeSchema, "params"),
  productTypeController.fetchByID
);
router.get("/", productTypeController.fetch);
router.post(
  "/",
  validate(createProductTypeSchema),
  productTypeController.create
);
router.put(
  "/",
  validate(updateProductTypeSchema),
  productTypeController.update
);

router.delete(
  "/:id",
  validate(paramProductTypeSchema, "params"),
  productTypeController.delete
);

export default router;
