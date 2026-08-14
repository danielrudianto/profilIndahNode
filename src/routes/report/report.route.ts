import { Router } from "express";
import ReportController from "../../controllers/report.controller";
import {
  requireRole,
  superadministratorMiddleware,
} from "../../utils/auth.helper";
import { prisma } from "../../utils/database.helper";
import { validate } from "../../utils/validate.helper";
import { AdjustmentCaseRepository } from "../../repositories/adjustment-case.repository";
import { CompanyRepository } from "../../repositories/company.repository";
import { CustomerRepository } from "../../repositories/customer.repository";
import { ExpenseTypeRepository } from "../../repositories/expense-type.repository";
import { ExpenseRepository } from "../../repositories/expense.repository";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";
import { OverpaymentRepository } from "../../repositories/overpayment.repository";
import { PaymentMethodRepository } from "../../repositories/payment-method.repository";
import { ProductStockRepository } from "../../repositories/product-stock.repository";
import { ProductRepository } from "../../repositories/product.repository";
import { PromotionRepository } from "../../repositories/promotion.repository";
import { SalesDepositPaymentRepository } from "../../repositories/sales-deposit-payment.repository";
import { SalesDepositRepository } from "../../repositories/sales-deposit.repository";
import { SalesInvoicePaymentRepository } from "../../repositories/sales-invoice-payment.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../../repositories/sales-return.repository";
import { StockCardRepository } from "../../repositories/stock-card.repository";
import { StockInRepository } from "../../repositories/stock-in.repository";
import { StockOutRepository } from "../../repositories/stock-out.repository";
import {
  outputPerusahaanSchema,
  outputSchema,
  penjualanHarianSchema,
  periodeBolehTahunanSchema,
  periodeKueriSchema,
  periodeWajibBulanSchema,
  rentangTanggalSchema,
  tanggalSchema,
} from "../../schemas/report.schema";

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

/*
  Matriks peran diturunkan dari app-routing.module.ts pada frontend:
    Purchasing [1,3,5,7]  Sales [2,3,5,7]  General [3,5,7]  Administrator [5,7]

  Peran 6 (Gudang) sengaja tidak disertakan: ia tidak muncul pada guard laporan
  mana pun di frontend dan hanya memakai rute /warehouse.
*/
const PERAN_PENJUALAN = [2, 3, 5, 7];
const PERAN_PEMBELIAN = [1, 3, 5, 7];
const PERAN_UMUM = [3, 5, 7];
const PERAN_SUPERADMIN = [7];

router.post(
  "/sales",
  requireRole(PERAN_PENJUALAN),
  validate(periodeWajibBulanSchema),
  reportController.fetchSalesReport
);

router.post(
  "/purchase",
  requireRole(PERAN_PEMBELIAN),
  validate(periodeWajibBulanSchema),
  reportController.fetchPurchaseReport
);

router.post(
  "/money-receipt",
  requireRole(PERAN_UMUM),
  validate(tanggalSchema),
  reportController.fetchMoneyReceipt
);

router.post(
  "/money-receipt/download",
  requireRole(PERAN_UMUM),
  validate(tanggalSchema),
  reportController.downloadMoneyReceipt
);

router.post(
  "/money-receipt/dor",
  requireRole(PERAN_UMUM),
  validate(rentangTanggalSchema),
  reportController.fetchDorMoneyReceipt
);

router.post(
  "/output",
  requireRole(PERAN_PENJUALAN),
  validate(outputSchema),
  reportController.fetchOutputReport
);

router.post(
  "/output-company",
  requireRole(PERAN_PENJUALAN),
  validate(outputPerusahaanSchema),
  reportController.fetchCompanyOutputReport
);

router.get(
  "/inventory",
  superadministratorMiddleware,
  reportController.fetchInventoryReport
);

router.post(
  "/daily-sales",
  requireRole(PERAN_UMUM),
  validate(penjualanHarianSchema),
  reportController.fetchDailySalesReport
);

router.post(
  "/purchase/download",
  requireRole(PERAN_PEMBELIAN),
  validate(periodeBolehTahunanSchema),
  reportController.downloadPurchaseReport
);

router.post(
  "/profit-loss",
  requireRole(PERAN_SUPERADMIN),
  validate(periodeBolehTahunanSchema),
  reportController.fetchProfitLoss
);

router.get(
  "/sales/brand",
  requireRole(PERAN_PENJUALAN),
  validate(periodeKueriSchema, "query"),
  reportController.fetchBrandSalesReport
);

router.get(
  "/sales/type",
  requireRole(PERAN_PENJUALAN),
  validate(periodeKueriSchema, "query"),
  reportController.fetchTypeSalesreport
);

router.get(
  "/sales/sales",
  requireRole(PERAN_PENJUALAN),
  validate(periodeKueriSchema, "query"),
  reportController.fetchSalesSalesReport
);

router.post(
  "/sales/download",
  requireRole(PERAN_PENJUALAN),
  validate(periodeBolehTahunanSchema),
  reportController.downloadSalesReport
);

/*
  POST /product-stock-problem dihapus. Endpoint itu membaca MongoDB yang
  koneksinya tidak pernah dibuka, jadi selalu gagal, dan isinya sama dengan
  POST /product-stock/problematic yang sudah berjalan di atas Prisma.
*/

export default router;
