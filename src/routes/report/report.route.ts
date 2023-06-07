import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import ReportController from "../../controller/report.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";

const router = Router();

router.post(
  "/money-receipt",
  body("date").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReportController.fetchMoneyReceipt
);

router.post(
  "/sales-item",
  body("month").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("year").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("group").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReportController.fetchSalesItemReport
);

router.post(
  "/purchase",
  body("month")
    .notEmpty()
    .isNumeric()
    .withMessage(ErrorList["Parameter error"]),
  body("year").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReportController.fetchPurchaseReport
);

router.get(
  "/profitloss/:month/:year/:report",
  administratorMiddleware,
  ReportController.fetchPLStats
);

router.get("/quickStats", ReportController.fetchQuickStats);

router.post("/sales", ReportController.fetchSalesReport);
router.post("/purchase/download", ReportController.fetchPurchaseReportDownload);
router.post("/purchase/detail", ReportController.fetchPurchaseItemDetail);
router.post("/purchase", ReportController.fetchPurchaseReport);
router.post(
  "/product-stock-problem",
  ReportController.fetchProductStockProblem
);

export default router;
