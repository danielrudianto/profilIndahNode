"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const sales_return_controller_1 = __importDefault(require("../../controller/sales-return.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const sales_return_repository_1 = require("../../repositories/sales-return.repository");
const stock_out_repository_1 = require("../../repositories/stock-out.repository");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const product_stock_repository_1 = require("../../repositories/product-stock.repository");
const router = (0, express_1.Router)();
const salesReturnController = new sales_return_controller_1.default(new sales_return_repository_1.SalesReturnRepository(database_helper_1.prisma), new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
router.get("/archives", salesReturnController.fetchAnnualArchives);
router.post("/archives", (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({ min: 2000 })
    .withMessage(error_list_1.default["Year must be numeric"]), (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("isActive").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isDelete").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isActive").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isDelete").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("sortBy").notEmpty().withMessage(error_list_1.default["Sort by required"]), (0, express_validator_1.body)("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(error_list_1.default["Sort direction only supports ascending or descending"]), error_helper_1.default.intercept, salesReturnController.fetchArchives);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("payment_method_id")
    .notEmpty()
    .withMessage(error_list_1.default["Payment method required"]), (0, express_validator_1.body)("payment_method_id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Payment method must be numeric"]), (0, express_validator_1.body)("sales_return")
    .isArray()
    .withMessage(error_list_1.default["Sales return items required"]), (0, express_validator_1.body)("sales_return.*.sales_invoice_id")
    .notEmpty()
    .withMessage(error_list_1.default["Sales invoice ID is required"]), (0, express_validator_1.body)("sales_return.*.sales_invoice_id")
    .isInt({
    min: 1,
})
    .withMessage(error_list_1.default["Sales invoice ID must be numeric"]), (0, express_validator_1.body)("sales_return.*.quantity")
    .notEmpty()
    .withMessage(error_list_1.default["Quantity is required"]), (0, express_validator_1.body)("sales_return.*.quantity")
    .isFloat({
    min: 0.01,
})
    .withMessage(error_list_1.default["Quantity must be numeric"]), error_helper_1.default.intercept, salesReturnController.create);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, salesReturnController.fetchByID);
// router.get(
//   "/code/:id",
//   param("id").notEmpty().withMessage(ErrorList["ID is required"]),
//   param("id").isInt({ min: 1 }).withMessage(ErrorList["ID must be numeric"]),
//   ErrorHelper.intercept,
//   SalesReturnController.fetchCodeByID
// );
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, auth_helper_1.administratorMiddleware, salesReturnController.deleteByID);
exports.default = router;
//# sourceMappingURL=sales-return.route.js.map