"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_price_sales_controller_1 = require("../../controller/product-price-sales.controller");
const database_helper_1 = require("../../helper/database.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_repository_1 = require("../../repositories/product.repository");
const router = (0, express_1.Router)();
const productSalesPriceController = new product_price_sales_controller_1.ProductSalesPriceController(new product_repository_1.ProductRepository(database_helper_1.prisma));
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, productSalesPriceController.fetchByID);
router.get("/", productSalesPriceController.fetch);
router.put("/", (0, express_validator_1.body)("product_id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("product_id")
    .isInt({ min: 1 })
    .withMessage(error_list_1.default["ID must be numeric"]), (0, express_validator_1.body)("sales_price").notEmpty().withMessage(error_list_1.default["Price required"]), (0, express_validator_1.body)("sales_discount").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("sales_price")
    .isNumeric()
    .withMessage(error_list_1.default["Price must be numeric"]), (0, express_validator_1.body)("sales_discount")
    .isNumeric()
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("product_unit")
    .isArray()
    .withMessage(error_list_1.default["Product unit must be an array"]), (0, express_validator_1.body)("product_unit.*.sales_price")
    .notEmpty()
    .withMessage(error_list_1.default["Price required"]), (0, express_validator_1.body)("product_unit.*.sales_discount")
    .notEmpty()
    .withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("product_unit.*.sales_price")
    .isNumeric()
    .withMessage(error_list_1.default["Price must be numeric"]), (0, express_validator_1.body)("product_unit.*.sales_discount")
    .isNumeric()
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("product_unit.*.product_unit_id")
    .notEmpty()
    .withMessage("Product unit ID is required"), error_helper_1.default.intercept, productSalesPriceController.update);
router.post("/format", product_price_sales_controller_1.ProductSalesPriceController.fetchFormat);
router.post("/bulk", product_price_sales_controller_1.ProductSalesPriceController.createBulk);
router.put("/v2", product_price_sales_controller_1.ProductSalesPriceController.updateByIDV2);
router.put("/", product_price_sales_controller_1.ProductSalesPriceController.updateByID);
exports.default = router;
//# sourceMappingURL=product-price-sales.route.js.map