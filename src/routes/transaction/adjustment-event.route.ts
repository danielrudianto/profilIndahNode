import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import AdjustmentCaseController from "../../controller/adjustment-event.controller";
import ErrorHelper from "../../helper/error.helper";
import { superadministratorMiddleware } from "../../helper/auth.helper";

const router = Router();

router.post("/archives/v2", AdjustmentCaseController.fetchArchivesV2);
router.post("/archives", AdjustmentCaseController.fetchArchives);
router.post(
  "/approve/:id",
  superadministratorMiddleware,
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  AdjustmentCaseController.approve
);
router.post(
  "/disapprove/:id",
  superadministratorMiddleware,
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  AdjustmentCaseController.disapprove
);

router.get("/unconfirmed", AdjustmentCaseController.fetchUnconfirmed);
router.get(
  "/code/:id",
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
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
