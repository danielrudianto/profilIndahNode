import { Router } from "express";
import ReportController from "../controller/report.controller";

const router = Router();

router.get("/profitloss/:month/:year", ReportController.fetchPLStats);

router.get("/frequent", ReportController.fetchFrequentItems);
router.get("/sales/monthly", ReportController.fetchMonthlySalesStats);
router.get("/sales", ReportController.fetchSalesStats);
router.get("/salesChart", ReportController.fetchSalesChart);

export default router;
