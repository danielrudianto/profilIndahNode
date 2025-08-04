"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_controller_1 = __importDefault(require("../../controller/product.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_repository_1 = require("../../repositories/product.repository");
const database_helper_1 = require("../../helper/database.helper");
const product_unit_repository_1 = require("../../repositories/product-unit.repository");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const router = (0, express_1.Router)();
const productController = new product_controller_1.default(new product_repository_1.ProductRepository(database_helper_1.prisma), new product_unit_repository_1.ProductUnitRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
router.post("/", (0, express_validator_1.body)("reference").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("reference").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("product_type_id").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("product_brand_id").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("unit").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("sales_price")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("purchase_price")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("sales_discount")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("purchase_discount")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productController.create);
router.get("/autocomplete", productController.fetchAutocomplete);
router.get("/selector", productController.fetchSelector);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, productController.fetchByID);
router.get("/", productController.fetch);
router.put("/active", (0, express_validator_1.body)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productController.toggleActive);
router.put("/", (0, express_validator_1.body)("id").exists().isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), (0, express_validator_1.body)("reference")
    .exists()
    .withMessage(error_list_1.default["Product reference is required"]), (0, express_validator_1.body)("reference")
    .notEmpty()
    .withMessage(error_list_1.default["Product reference is required"]), (0, express_validator_1.body)("description")
    .exists()
    .withMessage(error_list_1.default["Product description is required"]), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage(error_list_1.default["Product description is required"]), (0, express_validator_1.body)("product_brand_id")
    .exists()
    .withMessage(error_list_1.default["Product brand is required"]), (0, express_validator_1.body)("product_type_id")
    .exists()
    .withMessage(error_list_1.default["Product type is required"]), (0, express_validator_1.body)("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Product minimum stock is required"]), (0, express_validator_1.body)("unit").exists().withMessage(error_list_1.default["Product unit is required"]), error_helper_1.default.intercept, productController.update);
router.put("/price-purchase", (0, express_validator_1.body)("items").isArray().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("items.*.product_id")
    .notEmpty()
    .withMessage(error_list_1.default["Item ID required"]), (0, express_validator_1.body)("items.*.product_id")
    .isNumeric()
    .withMessage(error_list_1.default["Item ID must be numeric"]), (0, express_validator_1.body)("items.*.price").notEmpty().withMessage(error_list_1.default["Price required"]), (0, express_validator_1.body)("items.*.price")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Price must be numeric"]), (0, express_validator_1.body)("items.*.discount")
    .notEmpty()
    .withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("items.*.discount")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Discount must be numeric"]), error_helper_1.default.intercept, productController.updatePurchasePrice);
router.put("/price-sales", (0, express_validator_1.body)("items").isArray().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("items.*.product_id")
    .notEmpty()
    .withMessage(error_list_1.default["Item ID required"]), (0, express_validator_1.body)("items.*.product_id")
    .isNumeric()
    .withMessage(error_list_1.default["Item ID must be numeric"]), (0, express_validator_1.body)("items.*.price").notEmpty().withMessage(error_list_1.default["Price required"]), (0, express_validator_1.body)("items.*.price")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Price must be numeric"]), (0, express_validator_1.body)("items.*.discount")
    .notEmpty()
    .withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("items.*.discount")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Discount must be numeric"]), error_helper_1.default.intercept, productController.updateSalesPrice);
// router.post(
//   "/price-purchase",
//   body("item_id").notEmpty().withMessage(ErrorList["Parameter error"]),
//   ItemPurchasePriceController.fetchByID
// );
-router.delete("/:id", auth_helper_1.administratorMiddleware, (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productController.delete);
exports.default = router;
//# sourceMappingURL=product.route.js.map