import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import GoodReceiptController from "../../controller/good-receipt.controller";
import ErrorHelper from "../../helper/error.helper";
const router = Router();

router.post("/search", GoodReceiptController.search);

router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("name").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("company_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("supplier_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  GoodReceiptController.create
);

router.get("/archives", GoodReceiptController.fetchArchive);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  GoodReceiptController.fetchByID
);

export default router;
