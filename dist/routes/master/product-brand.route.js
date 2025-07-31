"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_brand_controller_1 = require("../../controller/product-brand.controller");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const database_helper_1 = require("../../helper/database.helper");
const product_brand_repository_1 = require("../../repositories/product-brand.repository");
const router = (0, express_1.Router)();
const productBrandController = new product_brand_controller_1.ProductBrandController(new product_brand_repository_1.ProductBrandRepository(database_helper_1.prisma));
// Validation helpers
const validateId = [
    (0, express_validator_1.param)("id").exists().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]),
];
const validateBodyForUpdate = [
    (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]),
];
const validateBodyForCreate = [
    (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Parameter error"]),
];
// Routes
router.get("/autocomplete", productBrandController.fetchAutocomplete);
router.get("/:id", [...validateId, error_helper_1.default.intercept], productBrandController.fetchByID);
router.get("/", productBrandController.fetch);
router.put("/", [...validateBodyForUpdate, error_helper_1.default.intercept], productBrandController.update);
router.post("/", [...validateBodyForCreate, error_helper_1.default.intercept], productBrandController.create);
router.delete("/:id", [...validateId, error_helper_1.default.intercept], productBrandController.delete);
exports.default = router;
//# sourceMappingURL=product-brand.route.js.map