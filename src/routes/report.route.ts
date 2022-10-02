import { Router } from "express";
import ReportController from "../controller/report.controller";

const router = Router();

router.get("/profitloss/:month/:year/:report", ReportController.fetchPLStats);
router.get("/reception/:year/:month/:date", ReportController.fetchReception);
router.post("/sales", ReportController.fetchSalesReport);
router.post("/frequent", ReportController.fetchFrequent);

export default router;
