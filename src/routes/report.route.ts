import {
  PERAN_PEMBELIAN,
  PERAN_PENJUALAN,
  PERAN_SUPERADMIN,
  PERAN_UMUM,
} from "../constants/role.constant";
import { Router } from "express";
import FinancialReportController from "../controllers/financial-report.controller";
import MoneyReceiptController from "../controllers/money-receipt.controller";
import PurchaseReportController from "../controllers/purchase-report.controller";
import SalesReportController from "../controllers/sales-report.controller";
import StockReportController from "../controllers/stock-report.controller";
import {
  requireRole,
  superadministratorMiddleware,
} from "../utils/auth.helper";
import { prisma } from "../utils/database.helper";
import { validate } from "../utils/validate.helper";
import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";
import { CompanyRepository } from "../repositories/company.repository";
import { ExpenseRepository } from "../repositories/expense.repository";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { OverpaymentRepository } from "../repositories/overpayment.repository";
import { SalesInvoiceRebateRepository } from "../repositories/sales-invoice-rebate.repository";
import { PaymentMethodRepository } from "../repositories/payment-method.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { ProductRepository } from "../repositories/product.repository";
import { SalesDepositPaymentRepository } from "../repositories/sales-deposit-payment.repository";
import { SalesInvoicePaymentRepository } from "../repositories/sales-invoice-payment.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { StockOutRepository } from "../repositories/stock-out.repository";
import {
  companyOutputSchema,
  outputSchema,
  dailySalesSchema,
  optionalMonthPeriodSchema,
  queryPeriodSchema,
  requiredMonthPeriodSchema,
  dateRangeSchema,
  dateSchema,
  inventoryQuerySchema,
} from "../schemas/report.schema";

const router = Router();

const salesReportController = new SalesReportController(
  new SalesInvoiceRepository(prisma),
  new SalesReturnRepository(prisma)
);

const purchaseReportController = new PurchaseReportController(
  new GoodReceiptRepository(prisma)
);

const moneyReceiptController = new MoneyReceiptController(
  new PaymentMethodRepository(prisma),
  new SalesInvoicePaymentRepository(prisma),
  new SalesDepositPaymentRepository(prisma),
  new SalesReturnRepository(prisma),
  new OverpaymentRepository(prisma),
  new SalesInvoiceRebateRepository(prisma)
);

const stockReportController = new StockReportController(
  new StockInRepository(prisma),
  new ProductRepository(prisma),
  new ProductStockRepository(prisma),
  new StockOutRepository(prisma),
  new GoodReceiptRepository(prisma),
  new AdjustmentCaseRepository(prisma)
);

const financialReportController = new FinancialReportController(
  new SalesInvoiceRepository(prisma),
  new GoodReceiptRepository(prisma),
  new CompanyRepository(prisma),
  new ExpenseRepository(prisma),
  new StockOutRepository(prisma)
);

router.post(
  "/sales",
  requireRole(PERAN_PENJUALAN),
  validate(requiredMonthPeriodSchema),
  salesReportController.fetchSalesReport
);

router.post(
  "/purchase",
  requireRole(PERAN_PEMBELIAN),
  validate(requiredMonthPeriodSchema),
  purchaseReportController.fetchPurchaseReport
);

router.post(
  "/money-receipt",
  requireRole(PERAN_UMUM),
  validate(dateSchema),
  moneyReceiptController.fetchMoneyReceipt
);

router.post(
  "/money-receipt/download",
  requireRole(PERAN_UMUM),
  validate(dateSchema),
  moneyReceiptController.downloadMoneyReceipt
);

router.post(
  "/money-receipt/dor",
  requireRole(PERAN_UMUM),
  validate(dateRangeSchema),
  moneyReceiptController.fetchDorMoneyReceipt
);

router.post(
  "/output",
  requireRole(PERAN_PENJUALAN),
  validate(outputSchema),
  stockReportController.fetchOutputReport
);

router.post(
  "/output-company",
  requireRole(PERAN_PENJUALAN),
  validate(companyOutputSchema),
  stockReportController.fetchCompanyOutputReport
);

router.get(
  "/inventory",
  superadministratorMiddleware,
  validate(inventoryQuerySchema, "query"),
  stockReportController.fetchInventoryReport
);

router.post(
  "/daily-sales",
  requireRole(PERAN_UMUM),
  validate(dailySalesSchema),
  financialReportController.fetchDailySalesReport
);

router.post(
  "/purchase/download",
  requireRole(PERAN_PEMBELIAN),
  validate(optionalMonthPeriodSchema),
  purchaseReportController.downloadPurchaseReport
);

router.post(
  "/profit-loss",
  requireRole(PERAN_SUPERADMIN),
  validate(optionalMonthPeriodSchema),
  financialReportController.fetchProfitLoss
);

router.get(
  "/sales/brand",
  requireRole(PERAN_PENJUALAN),
  validate(queryPeriodSchema, "query"),
  salesReportController.fetchBrandSalesReport
);

router.get(
  "/sales/type",
  requireRole(PERAN_PENJUALAN),
  validate(queryPeriodSchema, "query"),
  salesReportController.fetchTypeSalesreport
);

router.get(
  "/sales/customer",
  requireRole(PERAN_PENJUALAN),
  validate(queryPeriodSchema, "query"),
  salesReportController.fetchCustomerSalesReport
);

router.get(
  "/sales/sales",
  requireRole(PERAN_PENJUALAN),
  validate(queryPeriodSchema, "query"),
  salesReportController.fetchSalesSalesReport
);

router.post(
  "/sales/download",
  requireRole(PERAN_PENJUALAN),
  validate(optionalMonthPeriodSchema),
  salesReportController.downloadSalesReport
);

/*
  POST /product-stock-problem dihapus. Endpoint itu membaca MongoDB yang
  koneksinya tidak pernah dibuka, jadi selalu gagal, dan isinya sama dengan
  POST /product-stock/problematic yang sudah berjalan di atas Prisma.
*/

export default router;
