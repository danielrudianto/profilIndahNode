import { Router } from "express";
import { prisma } from "../utils/database.helper";
import ProductPackageController from "../controllers/product-package.controller";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { validate } from "../utils/validate.helper";
import {
  createPackageSchema,
  paramPackageSchema,
  updatePackagePriceSchema,
  updatePackageSchema,
} from "../schemas/product-package.schema";

const router = Router();

const productPackageController = new ProductPackageController(
  new ProductPackageRepository(prisma)
);

router.post(
  "/",
  validate(createPackageSchema),
  productPackageController.create
);

router.put("/", validate(updatePackageSchema), productPackageController.update);

router.put(
  "/price-sales",
  validate(updatePackagePriceSchema),
  productPackageController.updateSalesPrice
);

router.get(
  "/:id",
  validate(paramPackageSchema, "params"),
  productPackageController.fetchByID
);

router.delete(
  "/:id",
  validate(paramPackageSchema, "params"),
  productPackageController.delete
);

router.get("/", productPackageController.fetch);

export default router;
