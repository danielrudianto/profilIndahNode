"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_stock_controller_1 = __importDefault(require("../../controller/product-stock.controller"));
const product_stock_repository_1 = require("../../repositories/product-stock.repository");
const database_helper_1 = require("../../helper/database.helper");
const product_package_repository_1 = require("../../repositories/product-package.repository");
const product_repository_1 = require("../../repositories/product.repository");
const auth_helper_1 = require("../../helper/auth.helper");
const sales_deposit_repository_1 = require("../../repositories/sales-deposit.repository");
const router = (0, express_1.Router)();
const productStockController = new product_stock_controller_1.default(new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new product_package_repository_1.ProductPackageRepository(database_helper_1.prisma), new product_repository_1.ProductRepository(database_helper_1.prisma), new sales_deposit_repository_1.SalesDepositRepository(database_helper_1.prisma));
router.post("/product-stock", auth_helper_1.authMiddlewareRole, (0, express_validator_1.body)("keyword").exists().withMessage(error_list_1.default["Keyword is required"]), (0, express_validator_1.body)("page").notEmpty().withMessage(error_list_1.default["Page is required"]), (0, express_validator_1.body)("page")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Page must be numeric"]), error_helper_1.default.intercept, productStockController.fetchWarehouse);
router.post("/product-stock/inadequate", auth_helper_1.authMiddleware, (0, express_validator_1.body)("keyword").exists().withMessage(error_list_1.default["Keyword is required"]), (0, express_validator_1.body)("page").notEmpty().withMessage(error_list_1.default["Page is required"]), (0, express_validator_1.body)("page")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Page must be numeric"]), error_helper_1.default.intercept, productStockController.fetchInadequateWarehouse);
exports.default = router;
//# sourceMappingURL=warehouse.route.js.map