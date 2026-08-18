import { Router } from "express";
import CustomerController from "../controllers/customer.controller";
import { superadministratorMiddleware } from "../utils/auth.helper";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { CustomerRepository } from "../repositories/customer.repository";
import {
  createCustomerSchema,
  paramCustomerSchema,
  updateCustomerSchema,
} from "../schemas/customer.schema";

const router = Router();

const customerController = new CustomerController(
  new CustomerRepository(prisma)
);

router.post("/", validate(createCustomerSchema), customerController.create);

router.put("/", validate(updateCustomerSchema), customerController.update);

router.delete(
  "/:id",
  validate(paramCustomerSchema, "params"),
  customerController.delete
);

router.get("/autocomplete", customerController.fetchAutocomplete);

/*
  Laporan penjualan per pelanggan — SEBELUM "/:id" supaya "report" tidak
  tertangkap sebagai id, dan dikunci super administrator: nilai penjualan
  per pelanggan adalah angka yang sensitif.
*/
router.get(
  "/:id/report",
  superadministratorMiddleware,
  validate(paramCustomerSchema, "params"),
  customerController.fetchReport
);

router.get(
  "/:id",
  validate(paramCustomerSchema, "params"),
  customerController.fetchByID
);

router.get("/", customerController.fetch);

export default router;
