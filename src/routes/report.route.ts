import { Router } from "express";
import ReportController from "../controller/report.controller";

const router = Router();

router.get("/profitloss/:month/:year/:report", ReportController.fetchPLStats);
router.get("/inventory/:report", ReportController.fetchInventoryReport);
router.get("/reception/:year/:month/:date", ReportController.fetchReception);
router.get("/quickStats", ReportController.fetchQuickStats);
router.post("/sales", ReportController.fetchSalesReport);
router.post("/purchase/download", ReportController.fetchPurchaseReportDownload);
router.post("/purchase/detail", ReportController.fetchPurchaseItemDetail);
router.post("/purchase", ReportController.fetchPurchaseReport);
router.post("/frequent", ReportController.fetchFrequent);

export default router;
