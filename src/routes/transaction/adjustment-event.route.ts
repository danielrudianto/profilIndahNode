import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import AdjustmentCaseController from "../../controller/adjustment-event.controller";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post("/archives/v2", AdjustmentCaseController.fetchArchivesV2);
router.post("/archives", AdjustmentCaseController.fetchArchives);

router.get(
  "/code/:id",
  param("id").notEmpty().withMessage("Mohon isikan ID penyesuaian stock."),
  ErrorHelper.intercept,
  AdjustmentCaseController.fetchCodeByID
);

router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  AdjustmentCaseController.fetch
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
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  AdjustmentCaseController.deleteByID
);

export default router;
