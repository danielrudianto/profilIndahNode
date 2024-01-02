"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const report_controller_1 = __importDefault(require("../../controller/report.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const sales_invoice_controller_1 = __importDefault(require("../../controller/sales-invoice.controller"));
const router = (0, express_1.Router)();
router.post("/money-receipt", (0, express_validator_1.body)("date").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, report_controller_1.default.fetchMoneyReceipt);
router.post("/sales-item", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("group").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, report_controller_1.default.fetchSalesItemReport);
router.post("/purchase", (0, express_validator_1.body)("month")
    .notEmpty()
    .isNumeric()
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("year").notEmpty().isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, report_controller_1.default.fetchPurchaseReport);
router.post("/purchase/download", (0, express_validator_1.body)("month")
    .notEmpty()
    .isNumeric()
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("year").notEmpty().isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, report_controller_1.default.downloadPurchaseReport);
router.get("/profitloss/:month/:year/:report", auth_helper_1.administratorMiddleware, report_controller_1.default.fetchPLStats);
router.post("/sales", report_controller_1.default.fetchSalesReport);
router.post("/product-stock-problem", report_controller_1.default.fetchProductStockProblem);
router.get("/inventory/download", report_controller_1.default.downloadInventoryReport);
router.get("/inventory", report_controller_1.default.fetchInventoryReport);
router.get("/expense/:month/:year", report_controller_1.default.fetchExpenseReport);
router.get("/dashboard/sales", sales_invoice_controller_1.default.fetchDashboard);
exports.default = router;
//# sourceMappingURL=report.route.js.map