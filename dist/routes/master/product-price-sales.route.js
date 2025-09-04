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
router.put("/", (0, express_validator_1.body)("product_id")
    .notEmpty()
    .withMessage(error_list_1.default["Product ID is required"]), (0, express_validator_1.body)("product_id")
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["Product ID must be numeric"]), (0, express_validator_1.body)("data.*.product_unit_id")
    .exists()
    .withMessage(error_list_1.default["Product unit ID is required"]), (0, express_validator_1.body)("data.*.price").notEmpty().withMessage(error_list_1.default["Price is required"]), (0, express_validator_1.body)("data.*.price")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Price must be numeric"]), (0, express_validator_1.body)("data.*.discount").exists().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("data.*.discount")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("data").custom((dataArray) => {
    if (!Array.isArray(dataArray)) {
        throw new Error("Data must be an array");
    }
    for (const item of dataArray) {
        if (typeof item.price !== "number" || typeof item.discount !== "number") {
            throw new Error("Price and discount must be numbers");
        }
        if (item.discount > item.price) {
            throw new Error(`Discount (${item.discount}) must be less than price (${item.price}) for product_id ${item.product_id}`);
        }
    }
    return true; // validation passed
}), error_helper_1.default.intercept, productSalesPriceController.update);
router.post("/format", product_price_sales_controller_1.ProductSalesPriceController.fetchFormat);
router.post("/bulk", product_price_sales_controller_1.ProductSalesPriceController.createBulk);
router.put("/v2", product_price_sales_controller_1.ProductSalesPriceController.updateByIDV2);
router.put("/", product_price_sales_controller_1.ProductSalesPriceController.updateByID);
exports.default = router;
//# sourceMappingURL=product-price-sales.route.js.map