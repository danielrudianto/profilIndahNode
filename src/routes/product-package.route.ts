import { Router } from "express";
import { prisma } from "../utils/database.helper";
import ProductPackageController from "../controllers/product-package.controller";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { validate } from "../utils/validate.helper";
import {
  buatPaketSchema,
  paramPaketSchema,
  ubahHargaPaketSchema,
  ubahPaketSchema,
} from "../schemas/product-package.schema";

const router = Router();

const productPackageController = new ProductPackageController(
  new ProductPackageRepository(prisma)
);

router.post("/", validate(buatPaketSchema), productPackageController.create);

router.put("/", validate(ubahPaketSchema), productPackageController.update);

router.put(
  "/price-sales",
  validate(ubahHargaPaketSchema),
  productPackageController.updateSalesPrice
);

router.get(
  "/:id",
  validate(paramPaketSchema, "params"),
  productPackageController.fetchByID
);

router.delete(
  "/:id",
  validate(paramPaketSchema, "params"),
  productPackageController.delete
);

router.get("/", productPackageController.fetch);

export default router;
