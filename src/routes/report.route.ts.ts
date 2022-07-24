import { Router } from "express";
import ReportController from "../controller/report.controller";

const router = Router();

router.get("/sales", ReportController.fetchSalesStats);

export default router;
