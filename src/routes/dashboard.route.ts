import { Router } from "express";
import { prisma } from "../utils/database.helper";
import DashboardController from "../controllers/dashboard.controller";
import { DashboardRepository } from "../repositories/dashboard.repository";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { PromotionRepository } from "../repositories/promotion.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { administratorMiddleware } from "../utils/auth.helper";
import { validate } from "../utils/validate.helper";
import { inventoryQuerySchema } from "../schemas/report.schema";

const router = Router();

const dashboardController = new DashboardController(
  new DashboardRepository(prisma),
  new SalesInvoiceRepository(prisma),
  new GoodReceiptRepository(prisma),
  new PromotionRepository(prisma)
);

/*
  Mount di app.ts memakai authMiddleware karena dashboard sales dan
  purchasing dipakai peran non-administrator. Dashboard 9c berisi angka
  seluruh toko, jadi dikunci administrator di sini, per-route.
  Parameter date memakai skema tanggal-query yang sama dengan laporan
  persediaan.
*/
router.get(
  "/",
  administratorMiddleware,
  validate(inventoryQuerySchema, "query"),
  dashboardController.fetch
);

/*
  Lencana menu. Tanpa penjaga peran tambahan — menu di frontend sudah
  disaring peran, dan angkanya sendiri tidak membocorkan apa pun selain
  "ada sekian yang menunggu".
*/
router.get("/badges", dashboardController.fetchBadges);

router.post("/sales", dashboardController.fetchSalesDashboard);
router.post("/purchasing", dashboardController.fetchPurchaseDashboard);

export default router;
