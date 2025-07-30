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
const router = (0, express_1.Router)();
const productStockController = new product_stock_controller_1.default(new product_stock_repository_1.ProductStockRepository(database_helper_1.prisma), new product_repository_1.ProductRepository(database_helper_1.prisma));
router.get("/meta/:id", (0, express_validator_1.param)("id").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productStockController.fetchProductMetaDataByID);
router.get("/:id", (0, express_validator_1.param)("id").exists().isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productStockController.fetchByID);
router.get("/", (0, express_validator_1.query)("mode").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productStockController.fetch);
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
router.post("/", (0, express_validator_1.body)("mode").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_stock_controller_1.default.create);
exports.default = router;
//# sourceMappingURL=stock.route.js.map