import { Router } from "express";
import ReportController from "../../controller/report.controller";
import { prisma } from "../../helper/database.helper";
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

const router = Router();

router.post("/administrator", reportController.fetchAdministratorDashboard);
router.post("/sales", reportController.fetchSalesDashboard);
router.post("/purchasing", reportController.fetchPurchaseDashboard);

export default router;
