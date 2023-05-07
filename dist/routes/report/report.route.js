"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const report_controller_1 = __importDefault(require("../../controller/report.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.post("/money-receipt", (0, express_validator_1.body)("date").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, report_controller_1.default.fetchMoneyReceipt);
router.post("/sales-item", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("group").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, report_controller_1.default.fetchSalesItemReport);
router.post("/purchase", (0, express_validator_1.body)("month")
    .notEmpty()
    .isNumeric()
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("year").notEmpty().isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, report_controller_1.default.fetchPurchaseReport);
router.get("/profitloss/:month/:year/:report", report_controller_1.default.fetchPLStats);
router.get("/quickStats", report_controller_1.default.fetchQuickStats);
router.post("/sales", report_controller_1.default.fetchSalesReport);
router.post("/purchase/download", report_controller_1.default.fetchPurchaseReportDownload);
router.post("/purchase/detail", report_controller_1.default.fetchPurchaseItemDetail);
router.post("/purchase", report_controller_1.default.fetchPurchaseReport);
exports.default = router;
