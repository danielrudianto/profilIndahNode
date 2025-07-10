import { Router } from "express";
import ReportController from "../../controller/report.controller";
import { prisma } from "../../helper/database.helper";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";
import { PromotionRepository } from "../../repositories/promotion.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";

const reportController = new ReportController(
  new SalesInvoiceRepository(prisma),
  new PromotionRepository(prisma),
  new GoodReceiptRepository(prisma)
);

const router = Router();

router.post("/administrator", reportController.fetchAdministratorDashboard);
router.post("/sales", reportController.fetchSalesDashboard);
router.post("/purchase", reportController.fetchPurchaseDashboard);

export default router;
