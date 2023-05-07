import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import ItemUnitController from "../../controller/product-unit.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get(
  "/:id",
  param("id").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ItemUnitController.fetch
);

router.post(
  "/",
  body("item_id").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("item_unit").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ItemUnitController.create
);

router.get("/sales-price/:id", ItemUnitController.fetchByID);

export default router;
