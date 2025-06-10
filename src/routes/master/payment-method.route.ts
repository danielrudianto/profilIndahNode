import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import PaymentMethodController from "../../controller/payment-method.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import { prisma } from "../../helper/database.helper";
import { PaymentMethodRepository } from "../../repositories/payment-method.repository";

const router = Router();

const paymentMethodController = new PaymentMethodController(
  new PaymentMethodRepository(prisma)
);

router.get("/autocomplete", paymentMethodController.fetchAutocomplete);

router.get("/all", paymentMethodController.fetchAll);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  paymentMethodController.fetchByID
);

router.get("/", paymentMethodController.fetch);

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  paymentMethodController.create
);

router.put(
  "/",
  body("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  paymentMethodController.update
);

router.delete(
  "/:id",
  param("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  administratorMiddleware,
  paymentMethodController.delete
);

export default router;
