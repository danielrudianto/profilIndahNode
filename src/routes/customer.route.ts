import { Router } from "express";
import CustomerController from "../controllers/customer.controller";
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

router.get(
  "/:id",
  validate(paramCustomerSchema, "params"),
  customerController.fetchByID
);

router.get("/", customerController.fetch);

export default router;
