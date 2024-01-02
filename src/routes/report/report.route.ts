import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import ReportController from "../../controller/report.controller";
import { administratorMiddleware } from "../../helper/auth.helper";
import ErrorHelper from "../../helper/error.helper";
import SalesInvoiceController from "../../controller/sales-invoice.controller";

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
router.post(
  "/purchase/download",
  body("month")
    .notEmpty()
    .isNumeric()
    .withMessage(ErrorList["Parameter error"]),
  body("year").notEmpty().isNumeric().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReportController.downloadPurchaseReport
);

router.get(
  "/profitloss/:month/:year/:report",
  administratorMiddleware,
  ReportController.fetchPLStats
);

router.post("/sales", ReportController.fetchSalesReport);

router.post(
  "/product-stock-problem",
  ReportController.fetchProductStockProblem
);

router.get("/inventory/download", ReportController.downloadInventoryReport);
router.get("/inventory", ReportController.fetchInventoryReport);
router.get("/expense/:month/:year", ReportController.fetchExpenseReport);

router.get("/dashboard/sales", SalesInvoiceController.fetchDashboard);

export default router;
