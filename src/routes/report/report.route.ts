import { Router } from "express";
import { body } from "express-validator";
import ErrorList from "../../assets/error_list";
import ReportController from "../../controller/report.controller";
import {
  administratorMiddleware,
  superadministratorMiddleware,
} from "../../helper/auth.helper";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { CustomerRepository } from "../../repositories/customer.repository";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";
import { PaymentMethodRepository } from "../../repositories/payment-method.repository";
import { ProductRepository } from "../../repositories/product.repository";
import { PromotionRepository } from "../../repositories/promotion.repository";
import { SalesDepositPaymentRepository } from "../../repositories/sales-deposit-payment.repository";
import { SalesInvoicePaymentRepository } from "../../repositories/sales-invoice-payment.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../../repositories/sales-return.repository";
import { StockInRepository } from "../../repositories/stock-in.repository";
import { StockOutRepository } from "../../repositories/stock-out.repository";
import { StockRepository } from "../../repositories/stock.repository";

const router = Router();

const reportController = new ReportController(
  new SalesInvoiceRepository(prisma),
  new PromotionRepository(prisma),
  new GoodReceiptRepository(prisma),
  new CustomerRepository(prisma),
  new SalesReturnRepository(prisma),
  new SalesInvoicePaymentRepository(prisma),
  new SalesDepositPaymentRepository(prisma),
  new PaymentMethodRepository(prisma),
  new StockInRepository(prisma),
  new StockOutRepository(prisma),
  new ProductRepository(prisma),
  new StockRepository(prisma)
);

router.post(
  "/sales",
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({ min: 2000 })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.fetchSalesReport
);

router.post(
  "/purchase",
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({ min: 2000 })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.fetchPurchaseReport
);

router.post(
  "/money-receipt",
  body("date").exists().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  reportController.fetchMoneyReceipt
);

router.post(
  "/output",
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({ min: 2000 })
    .withMessage(ErrorList["Year must be numeric"]),
  body("group")
    .isIn(["brand", "type"])
    .withMessage(ErrorList["Invalid group report"]),
  body("type").isArray().withMessage(ErrorList["Type must be an array"]),
  body("type").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Type must be an integer"]);
    }
    return true;
  }),
  body("brand").isArray().withMessage(ErrorList["Type must be an array"]),
  body("brand").custom((value) => {
    if (!value.every((item: any) => Number.isInteger(item))) {
      throw new Error(ErrorList["Type must be an integer"]);
    }
    return true;
  }),
  ErrorHelper.intercept,
  reportController.fetchOutputReport
);

router.get("/inventory", reportController.fetchInventoryReport);

router.post(
  "/sales-item",
  body("month").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("year").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("group").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReportController.fetchOutputReport
);

router.post(
  "/sales-item-daily",
  body("day").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("month").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("year").notEmpty().withMessage(ErrorList["Parameter error"]),
  body("group").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  ReportController.fetchSalesItemDailyReport
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
  superadministratorMiddleware,
  ReportController.fetchPLStats
);

router.post("/sales", ReportController.fetchSalesReport);

router.post(
  "/product-stock-problem",
  ReportController.fetchProductStockProblem
);

router.get("/inventory/download", ReportController.downloadInventoryReport);

router.get("/expense/:month/:year", ReportController.fetchExpenseReport);

router.get("/dashboard/sales", ReportController.fetchSalesDashboard);
router.post("/dashboard/sales", ReportController.fetchSalesDashboardV2);

router.post(
  "/output-company/download",
  ReportController.fetchOutputReportCompany
);

export default router;
