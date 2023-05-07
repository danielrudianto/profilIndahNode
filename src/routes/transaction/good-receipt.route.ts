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
  "/code/:id",
  param("id").notEmpty().withMessage("Mohon isikan ID penerimaan barang."),
  GoodReceiptController.fetchCodeById
);
router.get(
  "/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  GoodReceiptController.fetchById
);

export default router;
