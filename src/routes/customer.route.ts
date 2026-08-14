import { Router } from "express";
import CustomerController from "../controllers/customer.controller";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { CustomerRepository } from "../repositories/customer.repository";
import {
  buatPelangganSchema,
  paramPelangganSchema,
  ubahPelangganSchema,
} from "../schemas/master.schema";

const router = Router();

const customerController = new CustomerController(
  new CustomerRepository(prisma)
);

router.post("/", validate(buatPelangganSchema), customerController.create);

router.put("/", validate(ubahPelangganSchema), customerController.update);

router.delete(
  "/:id",
  validate(paramPelangganSchema, "params"),
  customerController.delete
);

router.get("/autocomplete", customerController.fetchAutocomplete);

router.get(
  "/:id",
  validate(paramPelangganSchema, "params"),
  customerController.fetchByID
);

router.get("/", customerController.fetch);

export default router;
