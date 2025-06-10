import { Router } from "express";
import UserController from "../../controller/user.controller";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ErrorHelper from "../../helper/error.helper";
import DraftBillController from "../../controller/draft-bill.controller";
import PaymentMethodController from "../../controller/payment-method.controller";

const router = Router();

// router.get("/payment-method", PaymentMethodController.fetchAll);

router.get("/", UserController.fetchStats);

router.get(
  "/bill/:otc",
  param("otc").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesInvoiceController.fetchByOTC
);

router.post(
  "/bill/delete",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id").isInt().withMessage(ErrorList["ID is required"]),
  ErrorHelper.intercept,
  DraftBillController.deleteByID
);

router.post(
  "/bill/confirm",
  body("id").notEmpty().withMessage(ErrorList["ID is required"]),
  body("id").isInt().withMessage(ErrorList["ID is required"]),
  ErrorHelper.intercept,
  DraftBillController.confirmByID
);

export default router;
