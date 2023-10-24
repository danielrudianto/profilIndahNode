import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import SalesReturnController from "../../controller/sales-return.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post(
  "/search",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.fetchSearch
);
router.post("/archives", SalesReturnController.fetchArchives);
router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("payment_method_id")
    .notEmpty()
    .withMessage(ErrorList["Payment method required"]),
  ErrorHelper.intercept,
  SalesReturnController.create
);

router.get(
  "/code/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.fetchCodeByID
);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.fetchByID
);

router.delete(
  "/:id",
  administratorMiddleware,
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  SalesReturnController.deleteByID
);

export default router;
