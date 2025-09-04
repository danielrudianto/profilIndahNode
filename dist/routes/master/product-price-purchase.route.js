"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_price_purchase_controller_1 = require("../../controller/product-price-purchase.controller");
const database_helper_1 = require("../../helper/database.helper");
const product_repository_1 = require("../../repositories/product.repository");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
const productPurchasePriceController = new product_price_purchase_controller_1.ProductPurchasePriceController(new product_repository_1.ProductRepository(database_helper_1.prisma));
// router.get("/v2/:id", ItemPurchasePriceController.fetchByIDV2);
// router.get("/", ItemPurchasePriceController.fetch);
// router.put("/v2", ItemPurchasePriceController.updateV2);
// router.post("/format", ItemPurchasePriceController.fetchFormat);
// router.post("/bulk", ItemPurchasePriceController.createBulk);
// router.post("/", ItemPurchasePriceController.create);
router.get("/", productPurchasePriceController.fetch);
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
}), error_helper_1.default.intercept, productPurchasePriceController.updateByProductID);
exports.default = router;
//# sourceMappingURL=product-price-purchase.route.js.map