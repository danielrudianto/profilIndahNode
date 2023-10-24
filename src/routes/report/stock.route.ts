import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import ProductStockController from "../../controller/product-stock.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get(
  "/:id",
  param("id").exists().isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 1 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductStockController.fetchByID
);

router.get(
  "/",
  query("mode").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductStockController.fetch
);

router.post(
  "/",
  body("mode").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ProductStockController.create
);

export default router;
