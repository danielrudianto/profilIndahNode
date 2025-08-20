import { Router } from "express";
import ReportController from "../../controller/report.controller";
import { prisma } from "../../helper/database.helper";
import { ExpenseReportModel } from "../../model/expense.model";
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
  new ProductStockRepository(prisma),
  new CompanyRepository(prisma),
  new ExpenseRepository(prisma),
  new ExpenseTypeRepository(prisma),
  new OverpaymentRepository(prisma)
);

const router = Router();

router.post("/administrator", reportController.fetchAdministratorDashboard);
router.post("/sales", reportController.fetchSalesDashboard);
router.post("/purchasing", reportController.fetchPurchaseDashboard);

export default router;
