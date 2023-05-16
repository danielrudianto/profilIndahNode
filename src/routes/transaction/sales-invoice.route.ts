import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post("/search", SalesInvoiceController.search);
router.post(
  "/",
  body("customer_id").exists().withMessage(ErrorList["Parameter error"]),
  body("payment_method_id").exists().withMessage(ErrorList["Parameter error"]),
  body("discount")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("delivery")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  body("service")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesInvoiceController.create
);

router.get("/archives", SalesInvoiceController.fetchArchive);

router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesInvoiceController.fetchById
);

router.delete(
  "/:id",
  administratorMiddleware,
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesInvoiceController.deleteById
);

export default router;
