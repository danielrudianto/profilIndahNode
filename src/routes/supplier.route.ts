import { Router } from "express";
import SupplierController from "../controllers/supplier.controller";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { SupplierRepository } from "../repositories/supplier.repository";
import {
  getSupplierSchema,
  createSupplierSchema,
  deleteSupplierSchema,
  updateSupplierSchema,
} from "../schemas/supplier.schema";

const router = Router();

const supplierController = new SupplierController(
  new SupplierRepository(prisma),
  new GoodReceiptRepository(prisma)
);

router.get("/autocomplete", supplierController.fetchAutocomplete);

router.get(
  "/:id",
  validate(getSupplierSchema, "params"),
  supplierController.fetchByID
);

router.get("/", supplierController.fetch);

router.post("/", validate(createSupplierSchema), supplierController.create);

router.put("/", validate(updateSupplierSchema), supplierController.update);

router.delete(
  "/:id",
  validate(deleteSupplierSchema, "params"),
  supplierController.delete
);

export default router;
