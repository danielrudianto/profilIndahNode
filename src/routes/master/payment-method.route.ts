import { Router } from "express";
import PaymentMethodController from "../../controllers/payment-method.controller";
import { administratorMiddleware } from "../../utils/auth.helper";
import { prisma } from "../../utils/database.helper";
import { PaymentMethodRepository } from "../../repositories/payment-method.repository";
import { validate } from "../../utils/validate.helper";
import {
  buatMetodeSchema,
  hapusMetodeSchema,
  paramMetodeSchema,
  ubahMetodeSchema,
} from "../../schemas/master.schema";

const router = Router();

const paymentMethodController = new PaymentMethodController(
  new PaymentMethodRepository(prisma)
);

router.get("/autocomplete", paymentMethodController.fetchAutocomplete);

router.get("/all", paymentMethodController.fetchAll);

router.get(
  "/:id",
  validate(paramMetodeSchema, "params"),
  paymentMethodController.fetchByID
);

router.get("/", paymentMethodController.fetch);

router.post("/", validate(buatMetodeSchema), paymentMethodController.create);

router.put("/", validate(ubahMetodeSchema), paymentMethodController.update);

router.delete(
  "/:id",
  validate(hapusMetodeSchema, "params"),
  administratorMiddleware,
  paymentMethodController.delete
);

export default router;
