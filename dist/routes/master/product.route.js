"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_controller_1 = __importDefault(require("../../controller/product.controller"));
const product_price_sales_controller_1 = __importDefault(require("../../controller/product-price-sales.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_price_purchase_controller_1 = __importDefault(require("../../controller/product-price-purchase.controller"));
const router = (0, express_1.Router)();
router.post("/", (0, express_validator_1.body)("reference").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("reference").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("brand").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("type").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("unit").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("unit").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_controller_1.default.create);
router.get("/autocomplete", product_controller_1.default.fetchAutocomplete);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_controller_1.default.fetchByID);
router.get("/complete/:id", product_controller_1.default.fetchCompleteSalesById);
router.get("/", product_controller_1.default.fetch);
router.put("/active", (0, express_validator_1.body)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_controller_1.default.activateByID);
router.put("/", (0, express_validator_1.body)("id").exists().isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("reference").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("reference").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("brand").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("type").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("minimum_stock")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("unit").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_controller_1.default.updateByID);
router.post("/price-sales", (0, express_validator_1.body)("item_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), product_price_sales_controller_1.default.fetchByItemID);
router.post("/price-purchase", (0, express_validator_1.body)("item_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), product_price_purchase_controller_1.default.fetchByID);
-router.delete("/:id", auth_helper_1.administratorMiddleware, (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=product.route.js.map