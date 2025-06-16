import { Router } from "express";
import { body, param } from "express-validator";
import ErrorList from "../../assets/error_list";
import AdjustmentCaseController from "../../controller/adjustment-case.controller";
import ErrorHelper from "../../helper/error.helper";
import { superadministratorMiddleware } from "../../helper/auth.helper";
import { AdjustmentCaseRepository } from "../../repositories/adjustment-case.repository";
import { prisma } from "../../helper/database.helper";

const router = Router();

const adjustmentCaseController = new AdjustmentCaseController(
  new AdjustmentCaseRepository(prisma)
);

router.post("/archives/v2", AdjustmentCaseController.fetchArchivesV2);
router.post("/archives", AdjustmentCaseController.fetchArchives);
router.post(
  "/approve/:id",
  superadministratorMiddleware,
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  adjustmentCaseController.approve
);
router.post(
  "/disapprove/:id",
  superadministratorMiddleware,
  param("id").notEmpty().withMessage(ErrorList["Parameter error"]),
  param("id").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  adjustmentCaseController.reject
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
  body("adjustment_case").isArray().withMessage(ErrorList["Parameter error"]),
  body("adjustment_case.*.item_id")
    .notEmpty()
    .withMessage(ErrorList["Parameter error"]),
  body("adjustment_case.*.quantity")
    .notEmpty()
    .isNumeric()
    .withMessage(ErrorList["Parameter error"]),
  body("adjustment_case.*.item_unit_id")
    .exists()
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  adjustmentCaseController.create
);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  AdjustmentCaseController.deleteByID
);

export default router;
