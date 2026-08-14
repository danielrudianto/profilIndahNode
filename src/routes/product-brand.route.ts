import { Router } from "express";
import { ProductBrandController } from "../controllers/product-brand.controller";
import { prisma } from "../utils/database.helper";
import { ProductBrandRepository } from "../repositories/product-brand.repository";
import { validate } from "../utils/validate.helper";
import {
  createBrandSchema,
  paramBrandSchema,
  updateBrandSchema,
} from "../schemas/product-brand.schema";

const router = Router();
const productBrandController = new ProductBrandController(
  new ProductBrandRepository(prisma)
);

// Validation helpers

// Routes
router.get("/autocomplete", productBrandController.fetchAutocomplete);

router.get(
  "/:id",
  validate(paramBrandSchema, "params"),
  productBrandController.fetchByID
);

router.get("/", productBrandController.fetch);

router.put("/", validate(updateBrandSchema), productBrandController.update);

router.post("/", validate(createBrandSchema), productBrandController.create);

router.delete(
  "/:id",
  validate(paramBrandSchema, "params"),
  productBrandController.delete
);

export default router;
