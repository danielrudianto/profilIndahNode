import { Router } from "express";
import { body, query } from "express-validator";
import ErrorList from "../../assets/error_list";
import ReportController from "../../controller/report.controller";
import {
  administratorMiddleware,
  superadministratorMiddleware,
} from "../../helper/auth.helper";
import { prisma } from "../../helper/database.helper";
import ErrorHelper from "../../helper/error.helper";
import { CompanyRepository } from "../../repositories/company.repository";
import { CustomerRepository } from "../../repositories/customer.repository";
import { ExpenseTypeRepository } from "../../repositories/expense-type.repository";
import { ExpenseRepository } from "../../repositories/expense.repository";
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
import { ProductStockRepository } from "../../repositories/product-stock.repository";
import { OverpaymentRepository } from "../../repositories/overpayment.repository";
import { AdjustmentCaseRepository } from "../../repositories/adjustment-case.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";
import { SalesDepositRepository } from "../../repositories/sales-deposit.repository";

const router = Router();

const reportController = new ReportController(
  new SalesInvoiceRepository(prisma),
  new SalesDepositRepository(prisma),
  new PromotionRepository(prisma),
  new GoodReceiptRepository(prisma),
  new AdjustmentCaseRepository(prisma),
  new CustomerRepository(prisma),
  new SalesReturnRepository(prisma),
  new SalesInvoicePaymentRepository(prisma),
  new SalesDepositPaymentRepository(prisma),
  new PaymentMethodRepository(prisma),
  new StockInRepository(prisma),
  new StockOutRepository(prisma),
  new ProductRepository(prisma),
  new ProductStockRepository(prisma),
  new CompanyRepository(prisma),
  new ExpenseRepository(prisma),
  new ExpenseTypeRepository(prisma),
  new OverpaymentRepository(prisma),
  new StockCardRepository(prisma)
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
  body("date").exists().withMessage(ErrorList["Date required"]),
  ErrorHelper.intercept,
  reportController.fetchMoneyReceipt
);

router.post(
  "/money-receipt/download",
  body("date").exists().withMessage(ErrorList["Date required"]),
  ErrorHelper.intercept,
  reportController.downloadMoneyReceipt
);

router.post(
  "/money-receipt/dor",
  body("startDate").exists().withMessage(ErrorList["Date required"]),
  body("endDate").exists().withMessage(ErrorList["Date required"]),
  ErrorHelper.intercept,
  reportController.fetchDorMoneyReceipt
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

router.post(
  "/output-company",
  body("date").notEmpty().withMessage(ErrorList["Date required"]),
  body("company_id").notEmpty().withMessage(ErrorList["Company ID required"]),
  ErrorHelper.intercept,
  reportController.fetchCompanyOutputReport
);

router.get(
  "/inventory",
  superadministratorMiddleware,
  reportController.fetchInventoryReport
);

router.post(
  "/daily-sales",
  body("day").notEmpty().withMessage(ErrorList["Day is required"]),
  body("day")
    .isInt({
      min: 0,
      max: 31,
    })
    .withMessage(ErrorList["Day must be numeric"]),
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  body("group").notEmpty().withMessage(ErrorList["Parameter error"]),
  ErrorHelper.intercept,
  reportController.fetchDailySalesReport
);

router.post(
  "/purchase/download",
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.downloadPurchaseReport
);

router.post(
  "/profit-loss",
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.fetchProfitLoss
);

router.post(
  "/sales",
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("month")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.fetchSalesReport
);

router.get(
  "/sales/brand",
  query("month").notEmpty().withMessage(ErrorList["Month is required"]),
  query("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  query("year").notEmpty().withMessage(ErrorList["Year is required"]),
  query("year")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.fetchBrandSalesReport
);

router.get(
  "/sales/type",
  query("month").notEmpty().withMessage(ErrorList["Month is required"]),
  query("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  query("year").notEmpty().withMessage(ErrorList["Year is required"]),
  query("year")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.fetchTypeSalesreport
);

router.get(
  "/sales/sales",
  query("month").notEmpty().withMessage(ErrorList["Month is required"]),
  query("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  query("year").notEmpty().withMessage(ErrorList["Year is required"]),
  query("year")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.fetchSalesSalesReport
);

router.post(
  "/sales/download",
  body("month").notEmpty().withMessage(ErrorList["Month is required"]),
  body("month")
    .isInt({
      min: 0,
      max: 12,
    })
    .withMessage(ErrorList["Month must be numeric"]),
  body("year").notEmpty().withMessage(ErrorList["Year is required"]),
  body("year")
    .isInt({
      min: 2000,
    })
    .withMessage(ErrorList["Year must be numeric"]),
  ErrorHelper.intercept,
  reportController.downloadSalesReport
);

router.post(
  "/product-stock-problem",
  ReportController.fetchProductStockProblem
);

export default router;
