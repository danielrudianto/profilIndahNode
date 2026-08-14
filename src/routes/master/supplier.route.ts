import { Router } from "express";
import SupplierController from "../../controllers/supplier.controller";
import { prisma } from "../../utils/database.helper";
import { validate } from "../../utils/validate.helper";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";
import { SupplierRepository } from "../../repositories/supplier.repository";
import {
  ambilSupplierSchema,
  buatSupplierSchema,
  hapusSupplierSchema,
  ubahSupplierSchema,
} from "../../schemas/supplier.schema";

const router = Router();

const supplierController = new SupplierController(
  new SupplierRepository(prisma),
  new GoodReceiptRepository(prisma)
);

router.get("/autocomplete", supplierController.fetchAutocomplete);

router.get(
  "/:id",
  validate(ambilSupplierSchema, "params"),
  supplierController.fetchByID
);

router.get("/", supplierController.fetch);

router.post("/", validate(buatSupplierSchema), supplierController.create);

router.put("/", validate(ubahSupplierSchema), supplierController.update);

router.delete(
  "/:id",
  validate(hapusSupplierSchema, "params"),
  supplierController.delete
);

export default router;
