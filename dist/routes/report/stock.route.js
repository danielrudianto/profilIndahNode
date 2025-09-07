"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_stock_controller_1 = __importDefault(require("../../controller/product-stock.controller"));
const database_helper_1 = require("../../helper/database.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_stock_repository_1 = require("../../repositories/product-stock.repository");
const product_repository_1 = require("../../repositories/product.repository");
const product_package_repository_1 = require("../../repositories/product-package.repository");
const product_stock_card_controller_1 = require("../../controller/product-stock-card.controller");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const sales_deposit_repository_1 = require("../../repositories/sales-deposit.repository");
const router = (0, express_1.Router)();
const productStockController = new product_stock_controller_1.default(new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new product_package_repository_1.ProductPackageRepository(database_helper_1.prisma), new product_repository_1.ProductRepository(database_helper_1.prisma), new sales_deposit_repository_1.SalesDepositRepository(database_helper_1.prisma));
const stockCardController = new product_stock_card_controller_1.ProductStockCardController(new product_repository_1.ProductRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
router.get("/product/:id", (0, express_validator_1.param)("id").exists().isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, productStockController.fetchByProductID);
router.get("/package/:id", (0, express_validator_1.param)("id").exists().isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, productStockController.fetchByPackageID);
router.get("/:id", (0, express_validator_1.param)("id").exists().isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), (0, express_validator_1.query)("page").notEmpty().withMessage(error_list_1.default["Page is required"]), (0, express_validator_1.query)("page")
    .isInt({
    min: 1,
})
    .withMessage(error_list_1.default["Page must be numeric"]), (0, express_validator_1.query)("pageSize").notEmpty().withMessage(error_list_1.default["Page size is required"]), (0, express_validator_1.query)("pageSize")
    .isInt({
    min: 10,
})
    .withMessage(error_list_1.default["Page size must be numeric"]), error_helper_1.default.intercept, stockCardController.fetchByID);
router.get("/", (0, express_validator_1.query)("page").notEmpty().withMessage(error_list_1.default["Page is required"]), (0, express_validator_1.query)("page")
    .isInt({
    min: 1,
})
    .withMessage(error_list_1.default["Page must be numeric"]), (0, express_validator_1.query)("pageSize").notEmpty().withMessage(error_list_1.default["Page size is required"]), (0, express_validator_1.query)("pageSize")
    .isInt({
    min: 10,
})
    .withMessage(error_list_1.default["Page size must be numeric"]), error_helper_1.default.intercept, productStockController.fetch);
router.post("/problematic", (0, express_validator_1.body)("brands").exists().withMessage(error_list_1.default["Brand is required"]), (0, express_validator_1.body)("brands").isArray().withMessage(error_list_1.default["Brand must be an array"]), (0, express_validator_1.body)("brands").custom((value) => {
    if (!value.every((item) => Number.isInteger(item))) {
        throw new Error(error_list_1.default["Brand must be an integer"]);
    }
    return true;
}), (0, express_validator_1.body)("types").exists().withMessage(error_list_1.default["Type is required"]), (0, express_validator_1.body)("types").isArray().withMessage(error_list_1.default["Type must be an array"]), (0, express_validator_1.body)("types").custom((value) => {
    if (!value.every((item) => Number.isInteger(item))) {
        throw new Error(error_list_1.default["Type must be an integer"]);
    }
    return true;
}), error_helper_1.default.intercept, productStockController.fetchProblematic);
router.post("/inadequate", (0, express_validator_1.body)("brands").exists().withMessage(error_list_1.default["Brand is required"]), (0, express_validator_1.body)("brands").isArray().withMessage(error_list_1.default["Brand must be an array"]), (0, express_validator_1.body)("brands").custom((value) => {
    if (!value.every((item) => Number.isInteger(item))) {
        throw new Error(error_list_1.default["Brand must be an integer"]);
    }
    return true;
}), (0, express_validator_1.body)("types").exists().withMessage(error_list_1.default["Type is required"]), (0, express_validator_1.body)("types").isArray().withMessage(error_list_1.default["Type must be an array"]), (0, express_validator_1.body)("types").custom((value) => {
    if (!value.every((item) => Number.isInteger(item))) {
        throw new Error(error_list_1.default["Type must be an integer"]);
    }
    return true;
}), error_helper_1.default.intercept, productStockController.fetchInadequate);
router.post("/mutation", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("viewBy").notEmpty().withMessage(error_list_1.default["View by mutation required"]), (0, express_validator_1.body)("viewBy")
    .isIn(["date", "created"])
    .withMessage(error_list_1.default["View by mutation must be either document date or creation date"]), error_helper_1.default.intercept, stockCardController.fetchMutation);
router.post("/", (0, express_validator_1.body)("mode").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_stock_controller_1.default.create);
exports.default = router;
//# sourceMappingURL=stock.route.js.map