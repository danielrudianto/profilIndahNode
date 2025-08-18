"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const sales_invoice_controller_1 = __importDefault(require("../../controller/sales-invoice.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const receivable_repository_1 = require("../../repositories/receivable.repository");
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const redis_helper_1 = require("../../helper/redis.helper");
const sales_controller_1 = require("../../controller/sales.controller");
const stock_out_repository_1 = require("../../repositories/stock-out.repository");
const sales_invoice_payment_repository_1 = require("../../repositories/sales-invoice-payment.repository");
const sales_return_repository_1 = require("../../repositories/sales-return.repository");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const product_stock_repository_1 = require("../../repositories/product-stock.repository");
const router = (0, express_1.Router)();
const salesInvoiceController = new sales_invoice_controller_1.default(new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new receivable_repository_1.ReceivableRepository(redis_helper_1.redisClient, database_helper_1.prisma), new sales_return_repository_1.SalesReturnRepository(database_helper_1.prisma), new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new sales_invoice_payment_repository_1.SalesInvoicePaymentRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
const salesmanController = new sales_controller_1.SalesmanController(redis_helper_1.redisClient);
router.get("/archives", salesInvoiceController.fetchAnnualArchives);
router.post("/archives", (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({ min: 2000 })
    .withMessage(error_list_1.default["Year must be numeric"]), (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("page").notEmpty().withMessage(error_list_1.default["Page is required"]), (0, express_validator_1.body)("page").isInt({ min: 1 }).withMessage(error_list_1.default["Page must be numeric"]), (0, express_validator_1.body)("pageSize").notEmpty().withMessage(error_list_1.default["Page size is required"]), (0, express_validator_1.body)("pageSize")
    .isInt({
    min: 10,
    max: 50,
})
    .withMessage(error_list_1.default["Page size must be numeric"]), (0, express_validator_1.body)("isPaid").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isUnpaid").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isActive").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isDelete").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isPaid").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isUnpaid").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isActive").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isDelete").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("sortBy").notEmpty().withMessage(error_list_1.default["Sort by required"]), (0, express_validator_1.body)("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(error_list_1.default["Sort direction only supports ascending or descending"]), error_helper_1.default.intercept, salesInvoiceController.fetchArchives);
router.post("/sales-return", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("sales_invoice")
    .isArray()
    .withMessage(error_list_1.default["Sales invoice item must be an array"]), (0, express_validator_1.body)("sales_invoice.*.product_id")
    .notEmpty()
    .withMessage(error_list_1.default["Item ID required"]), (0, express_validator_1.body)("sales_invoice.*.product_id")
    .isInt({ min: 1 })
    .withMessage(error_list_1.default["Item ID must be numeric"]), (0, express_validator_1.body)("sales_invoice.*.quantity")
    .notEmpty()
    .withMessage(error_list_1.default["Quantity is required"]), (0, express_validator_1.body)("sales_invoice.*.quantity")
    .isFloat({ min: 0.01 })
    .withMessage(error_list_1.default["Quantity must be numeric"]), error_helper_1.default.intercept, salesInvoiceController.searchSalesReturn);
router.post("/", (0, express_validator_1.body)("uuid").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("customer_id")
    .exists()
    .withMessage(error_list_1.default["Customer ID is required"]), (0, express_validator_1.body)("discount").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("discount")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("delivery").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("delivery")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("service").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("service")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("is_paid")
    .isBoolean()
    .withMessage(error_list_1.default["Payment status is required"]), error_helper_1.default.intercept, salesmanController.createSalesman, salesInvoiceController.create);
router.get("/payment/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, salesInvoiceController.fetchPayments);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, salesInvoiceController.fetchByID);
router.delete("/:id", auth_helper_1.administratorMiddleware, (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, salesInvoiceController.delete
// SalesInvoiceController.deleteByID
);
exports.default = router;
//# sourceMappingURL=sales-invoice.route.js.map