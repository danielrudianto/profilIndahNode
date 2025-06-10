import { Router } from "express";
import { body, param } from "express-validator";
import ErrorHelper from "../../helper/error.helper";
import SalesInvoiceController from "../../controller/sales-invoice.controller";
import ErrorList from "../../assets/error_list";

const router = Router();

// router.get("/product-type", ProductTypeController.fetchAll);

router.post(
  "/",
  body("last_fetched").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("last_fetched").isInt().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  // SalesInvoiceController.fetchSince
);

export default router;
