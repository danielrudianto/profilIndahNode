"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = __importDefault(require("../controller/report.controller"));
const router = (0, express_1.Router)();
router.get("/sales/monthly", report_controller_1.default.fetchMonthlySalesStats);
router.get("/sales", report_controller_1.default.fetchSalesStats);
router.get("/salesChart", report_controller_1.default.fetchSalesChart);
exports.default = router;
