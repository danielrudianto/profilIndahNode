"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../../controller/auth.controller"));
const customer_controller_1 = __importDefault(require("../../controller/customer.controller"));
const expense_controller_1 = __importDefault(require("../../controller/expense.controller"));
const product_controller_1 = __importDefault(require("../../controller/product.controller"));
const purchase_invoice_controller_1 = __importDefault(require("../../controller/purchase-invoice.controller"));
const sales_invoice_controller_1 = __importDefault(require("../../controller/sales-invoice.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.default.login);
router.post("/refresh-token", auth_helper_1.authMiddleware, auth_controller_1.default.refreshToken);
router.post("/product", auth_helper_1.authMiddleware, product_controller_1.default.fetch);
router.get("/sales", auth_helper_1.authMiddleware, sales_invoice_controller_1.default.fetchDashboard);
router.get("/purchase", auth_helper_1.authMiddleware, purchase_invoice_controller_1.default.fetchDashboard);
router.post("/expense", expense_controller_1.default.fetchDashboard);
router.get("/product/:id", auth_helper_1.authMiddleware, product_controller_1.default.fetchCompleteById);
router.get("/customer", auth_helper_1.authMiddleware, customer_controller_1.default.fetch);
exports.default = router;
//# sourceMappingURL=administrator.route.js.map