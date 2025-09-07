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
const database_helper_1 = require("../../helper/database.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const company_repository_1 = require("../../repositories/company.repository");
const customer_repository_1 = require("../../repositories/customer.repository");
const expense_type_repository_1 = require("../../repositories/expense-type.repository");
const expense_repository_1 = require("../../repositories/expense.repository");
const good_receipt_repository_1 = require("../../repositories/good-receipt.repository");
const payment_method_repository_1 = require("../../repositories/payment-method.repository");
const product_repository_1 = require("../../repositories/product.repository");
const promotion_repository_1 = require("../../repositories/promotion.repository");
const sales_deposit_payment_repository_1 = require("../../repositories/sales-deposit-payment.repository");
const sales_invoice_payment_repository_1 = require("../../repositories/sales-invoice-payment.repository");
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const sales_return_repository_1 = require("../../repositories/sales-return.repository");
const stock_in_repository_1 = require("../../repositories/stock-in.repository");
const stock_out_repository_1 = require("../../repositories/stock-out.repository");
const product_stock_repository_1 = require("../../repositories/product-stock.repository");
const overpayment_repository_1 = require("../../repositories/overpayment.repository");
const adjustment_case_repository_1 = require("../../repositories/adjustment-case.repository");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const router = (0, express_1.Router)();
const reportController = new report_controller_1.default(new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new promotion_repository_1.PromotionRepository(database_helper_1.prisma), new good_receipt_repository_1.GoodReceiptRepository(database_helper_1.prisma), new adjustment_case_repository_1.AdjustmentCaseRepository(database_helper_1.prisma), new customer_repository_1.CustomerRepository(database_helper_1.prisma), new sales_return_repository_1.SalesReturnRepository(database_helper_1.prisma), new sales_invoice_payment_repository_1.SalesInvoicePaymentRepository(database_helper_1.prisma), new sales_deposit_payment_repository_1.SalesDepositPaymentRepository(database_helper_1.prisma), new payment_method_repository_1.PaymentMethodRepository(database_helper_1.prisma), new stock_in_repository_1.StockInRepository(database_helper_1.prisma), new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new product_repository_1.ProductRepository(database_helper_1.prisma), new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new company_repository_1.CompanyRepository(database_helper_1.prisma), new expense_repository_1.ExpenseRepository(database_helper_1.prisma), new expense_type_repository_1.ExpenseTypeRepository(database_helper_1.prisma), new overpayment_repository_1.OverpaymentRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
router.post("/sales", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({ min: 2000 })
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.fetchSalesReport);
router.post("/purchase", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({ min: 2000 })
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.fetchPurchaseReport);
router.post("/money-receipt", (0, express_validator_1.body)("date").exists().withMessage(error_list_1.default["Date required"]), error_helper_1.default.intercept, reportController.fetchMoneyReceipt);
router.post("/output", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({ min: 2000 })
    .withMessage(error_list_1.default["Year must be numeric"]), (0, express_validator_1.body)("group")
    .isIn(["brand", "type"])
    .withMessage(error_list_1.default["Invalid group report"]), (0, express_validator_1.body)("type").isArray().withMessage(error_list_1.default["Type must be an array"]), (0, express_validator_1.body)("type").custom((value) => {
    if (!value.every((item) => Number.isInteger(item))) {
        throw new Error(error_list_1.default["Type must be an integer"]);
    }
    return true;
}), (0, express_validator_1.body)("brand").isArray().withMessage(error_list_1.default["Type must be an array"]), (0, express_validator_1.body)("brand").custom((value) => {
    if (!value.every((item) => Number.isInteger(item))) {
        throw new Error(error_list_1.default["Type must be an integer"]);
    }
    return true;
}), error_helper_1.default.intercept, reportController.fetchOutputReport);
router.post("/output-company", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("company_id").notEmpty().withMessage(error_list_1.default["Company ID required"]), error_helper_1.default.intercept, reportController.fetchCompanyOutputReport);
router.get("/inventory", auth_helper_1.superadministratorMiddleware, reportController.fetchInventoryReport);
router.post("/daily-sales", (0, express_validator_1.body)("day").notEmpty().withMessage(error_list_1.default["Day is required"]), (0, express_validator_1.body)("day")
    .isInt({
    min: 0,
    max: 31,
})
    .withMessage(error_list_1.default["Day must be numeric"]), (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({
    min: 0,
    max: 12,
})
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({
    min: 2000,
})
    .withMessage(error_list_1.default["Year must be numeric"]), (0, express_validator_1.body)("group").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, reportController.fetchDailySalesReport);
router.post("/purchase/download", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({
    min: 0,
    max: 12,
})
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({
    min: 2000,
})
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.downloadPurchaseReport);
router.post("/profit-loss", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({
    min: 0,
    max: 12,
})
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({
    min: 2000,
})
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.fetchProfitLoss);
router.post("/sales", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({
    min: 0,
    max: 12,
})
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("month")
    .isInt({
    min: 2000,
})
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.fetchSalesReport);
router.get("/sales/brand", (0, express_validator_1.query)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.query)("month")
    .isInt({
    min: 0,
    max: 12,
})
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.query)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.query)("year")
    .isInt({
    min: 2000,
})
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.fetchBrandSalesReport);
router.get("/sales/type", (0, express_validator_1.query)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.query)("month")
    .isInt({
    min: 0,
    max: 12,
})
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.query)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.query)("year")
    .isInt({
    min: 2000,
})
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.fetchTypeSalesreport);
router.post("/sales/download", (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({
    min: 0,
    max: 12,
})
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({
    min: 2000,
})
    .withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, reportController.downloadSalesReport);
router.post("/product-stock-problem", report_controller_1.default.fetchProductStockProblem);
exports.default = router;
//# sourceMappingURL=report.route.js.map