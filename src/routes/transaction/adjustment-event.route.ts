import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import AdjustmentCaseController from "../../controller/adjustment-event.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.get("/archives", AdjustmentCaseController.fetchArchives);

router.get(
  "/code/:id",
  param("id").notEmpty().withMessage("Mohon isikan ID penyesuaian stock."),
  AdjustmentCaseController.fetchCodeById
);

router.get(
  "/:id",
  param("id")
    .isInt({
      min: 0,
    })
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  AdjustmentCaseController.fetchById
);

router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("type").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  AdjustmentCaseController.create
);

router.delete(
  "/:id",
  param("id").isInt({ min: 0 }).withMessage(""),
  AdjustmentCaseController.deleteById
);

export default router;
