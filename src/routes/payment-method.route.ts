import { Router } from "express";
import PaymentMethodController from "../controllers/payment-method.controller";
import { administratorMiddleware } from "../utils/auth.helper";
import { prisma } from "../utils/database.helper";
import { PaymentMethodRepository } from "../repositories/payment-method.repository";
import { validate } from "../utils/validate.helper";
import {
  createPaymentMethodSchema,
  deletePaymentMethodSchema,
  paramPaymentMethodSchema,
  updatePaymentMethodSchema,
} from "../schemas/payment-method.schema";

const router = Router();

const paymentMethodController = new PaymentMethodController(
  new PaymentMethodRepository(prisma)
);

router.get("/autocomplete", paymentMethodController.fetchAutocomplete);

router.get("/all", paymentMethodController.fetchAll);

router.get(
  "/:id",
  validate(paramPaymentMethodSchema, "params"),
  paymentMethodController.fetchByID
);

router.get("/", paymentMethodController.fetch);

router.post(
  "/",
  validate(createPaymentMethodSchema),
  paymentMethodController.create
);

router.put(
  "/",
  validate(updatePaymentMethodSchema),
  paymentMethodController.update
);

router.delete(
  "/:id",
  validate(deletePaymentMethodSchema, "params"),
  administratorMiddleware,
  paymentMethodController.delete
);

export default router;
