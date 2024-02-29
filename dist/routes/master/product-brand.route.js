"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_brand_controller_1 = __importDefault(require("../../controller/product-brand.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/autocomplete", product_brand_controller_1.default.fetchAutocomplete);
router.get("/:id", (0, express_validator_1.param)("id").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_brand_controller_1.default.fetchByID);
router.get("/", product_brand_controller_1.default.fetch);
router.put("/", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_brand_controller_1.default.updateByID);
router.post("/", (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_brand_controller_1.default.create);
router.delete("/:id", (0, express_validator_1.param)("id").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_brand_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=product-brand.route.js.map