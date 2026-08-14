import { Router } from "express";
import { ProductBrandController } from "../controllers/product-brand.controller";
import { prisma } from "../utils/database.helper";
import { ProductBrandRepository } from "../repositories/product-brand.repository";
import { validate } from "../utils/validate.helper";
import {
  buatMerekSchema,
  paramMerekSchema,
  ubahMerekSchema,
} from "../schemas/master-lain.schema";

const router = Router();
const productBrandController = new ProductBrandController(
  new ProductBrandRepository(prisma)
);

// Validation helpers

// Routes
router.get("/autocomplete", productBrandController.fetchAutocomplete);

router.get(
  "/:id",
  validate(paramMerekSchema, "params"),
  productBrandController.fetchByID
);

router.get("/", productBrandController.fetch);

router.put("/", validate(ubahMerekSchema), productBrandController.update);

router.post("/", validate(buatMerekSchema), productBrandController.create);

router.delete(
  "/:id",
  validate(paramMerekSchema, "params"),
  productBrandController.delete
);

export default router;
