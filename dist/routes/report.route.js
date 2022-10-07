"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = __importDefault(require("../controller/report.controller"));
const router = (0, express_1.Router)();
router.get("/profitloss/:month/:year/:report", report_controller_1.default.fetchPLStats);
router.get("/reception/:year/:month/:date", report_controller_1.default.fetchReception);
router.get("/quickStats", report_controller_1.default.fetchQuickStats);
router.post("/sales", report_controller_1.default.fetchSalesReport);
router.post("/purchase/download", report_controller_1.default.fetchPurchaseReportDownload);
router.post("/purchase", report_controller_1.default.fetchPurchaseReport);
router.post("/frequent", report_controller_1.default.fetchFrequent);
exports.default = router;
