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
  ErrorHelper.intercept,
  adjustmentCaseController.fetchAnnualArchives
);

router.post(
  "/archives",
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({ min: 2000 })
    .withMessage(ErrorList["Year must be numeric"]),
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(ErrorList["Month must be numeric"]),
  body("isActive").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isDelete").isBoolean().withMessage(ErrorList["Parameter error"]),
  body("isLost")
    .isBoolean()
    .withMessage(ErrorList["Adjustment case lost type must be boolean"]),
  body("isFound")
    .isBoolean()
    .withMessage(ErrorList["Adjustment case found type must be boolean"]),
  body("sortBy").notEmpty().withMessage(ErrorList["Sort by required"]),
  body("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(
      ErrorList["Sort direction only supports ascending or descending"]
    ),
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
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("type")
    .isInt({ min: 0 })
    .withMessage(ErrorList["Adjustment case type is required"]),
  body("adjustment_case").isArray().withMessage(ErrorList["Parameter error"]),
  body("adjustment_case.*.product_id")
    .notEmpty()
    .withMessage(ErrorList["Product ID is required"]),
  body("adjustment_case.*.quantity")
    .notEmpty()
    .withMessage(ErrorList["Quantity is required"]),
  body("adjustment_case.*.quantity")
    .isFloat({
      min: 0,
    })
    .withMessage(ErrorList["Quantity must be numeric"]),
  body("adjustment_case.*.product_unit_id")
    .exists()
    .withMessage(ErrorList["Product unit ID is required"]),
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
