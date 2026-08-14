import { Router } from "express";
import DashboardController from "../../controllers/dashboard.controller";
import { prisma } from "../../utils/database.helper";
import { GoodReceiptRepository } from "../../repositories/good-receipt.repository";
import { PromotionRepository } from "../../repositories/promotion.repository";
import { SalesDepositRepository } from "../../repositories/sales-deposit.repository";
import { SalesInvoiceRepository } from "../../repositories/sales-invoice.repository";

const router = Router();

const dashboardController = new DashboardController(
  new SalesInvoiceRepository(prisma),
  new GoodReceiptRepository(prisma),
  new PromotionRepository(prisma),
  new SalesDepositRepository(prisma)
);

router.post("/administrator", dashboardController.fetchAdministratorDashboard);
router.post("/sales", dashboardController.fetchSalesDashboard);
router.post("/purchasing", dashboardController.fetchPurchaseDashboard);

export default router;
