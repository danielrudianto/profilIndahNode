import { Router } from "express";
import { body, param, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import AdjustmentCaseController from "../../controller/adjustment-case.controller";
import ErrorHelper from "../../helper/error.helper";
import { superadministratorMiddleware } from "../../helper/auth.helper";
import { AdjustmentCaseRepository } from "../../repositories/adjustment-case.repository";
import { prisma } from "../../helper/database.helper";
import { StockRepository } from "../../repositories/stock.repository";
import { StockInRepository } from "../../repositories/stock-in.repository";
import { StockOutRepository } from "../../repositories/stock-out.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";

const router = Router();

const adjustmentCaseController = new AdjustmentCaseController(
  new AdjustmentCaseRepository(prisma),
  new StockRepository(prisma),
  new StockInRepository(prisma),
  new StockOutRepository(prisma),
  new StockCardRepository(prisma)
);

router.get(
  "/archives",
  query(["year", "month"]).custom((value, { req }) => {
    const { year, month } = (req.query ?? {}) as {
      year?: string;
      month?: string;
    };

    const allUndefined = year === undefined && month === undefined;
    const allTyped =
      (year === undefined || !isNaN(Number(year))) &&
      (month === undefined || !isNaN(Number(month)));

    if (!allUndefined && !(year && month && allTyped)) {
      throw new Error(ErrorList["Archives parameter error"]);
    }

    return true;
  }),
  ErrorHelper.intercept,
  adjustmentCaseController.fetchArchives
);
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

router.get("/unconfirmed", adjustmentCaseController.fetchUnconfirmed);
router.get(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  adjustmentCaseController.fetchByID
);

router.post(
  "/",
  body("date").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("type").isInt({ min: 0 }).withMessage(ErrorList["Parameter error"]),
  body("adjustment_case").isArray().withMessage(ErrorList["Parameter error"]),
  body("adjustment_case.*.product_id")
    .notEmpty()
    .withMessage(ErrorList["Parameter error"]),
  body("adjustment_case.*.quantity")
    .notEmpty()
    .isNumeric()
    .withMessage(ErrorList["Parameter error"]),
  body("adjustment_case.*.product_unit_id")
    .exists()
    .withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  adjustmentCaseController.create
);

router.delete(
  "/:id",
  param("id").isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  adjustmentCaseController.delete
);

export default router;
