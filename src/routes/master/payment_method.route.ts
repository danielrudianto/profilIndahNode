import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import PaymentMethodController from "../../controller/payment-method.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/autocomplete", PaymentMethodController.fetchAutocomplete);
router.get("/all", PaymentMethodController.fetchAll);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  PaymentMethodController.fetchByID
);
router.get("/", PaymentMethodController.fetch);

router.post(
  "/",
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  PaymentMethodController.create
);

router.put(
  "/",
  body("id").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("name").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  body("description").not().isEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  PaymentMethodController.updateByID
);

router.delete("/:id", administratorMiddleware, PaymentMethodController.delete);

export default router;
