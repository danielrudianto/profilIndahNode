"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_helper_1 = require("../../helper/auth.helper");
const report_controller_1 = __importDefault(require("../../controller/report.controller"));
const router = (0, express_1.Router)();
// router.post("/login", AuthController.login);
// router.post("/refresh-token", authMiddleware, AuthController.refreshToken);
// router.post("/product", authMiddleware, ProductController.fetch);
router.get("/sales", auth_helper_1.authMiddleware, report_controller_1.default.fetchSalesDashboard);
router.get("/purchase", auth_helper_1.authMiddleware
// PurchaseInvoiceController.fetchDashboard
);
// router.post("/expense", ExpenseController.fetchDashboard);
// router.get("/product/:id", authMiddleware, ProductController.fetchCompleteById);
// router.get("/customer", authMiddleware, CustomerController.fetch);
exports.default = router;
//# sourceMappingURL=administrator.route.js.map