"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_package_controller_1 = __importDefault(require("../../controller/product-package.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const product_package_repository_1 = require("../../repositories/product-package.repository");
const router = (0, express_1.Router)();
const productPackageController = new product_package_controller_1.default(new product_package_repository_1.ProductPackageRepository(database_helper_1.prisma));
router.post("/", (0, express_validator_1.body)("price").notEmpty().withMessage(error_list_1.default["Price is required"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Package name required"]), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage(error_list_1.default["Package description required"]), (0, express_validator_1.body)("package_content")
    .notEmpty()
    .withMessage(error_list_1.default["Package items required"]), (0, express_validator_1.body)("package_content.*.product_id")
    .notEmpty()
    .withMessage(error_list_1.default["Package item id required"]), (0, express_validator_1.body)("package_content.*.quantity")
    .notEmpty()
    .withMessage(error_list_1.default["Package item quantity required"]), (0, express_validator_1.body)("package_content.*.product_unit_id")
    .exists()
    .withMessage(error_list_1.default["Package item unit id required"]), (0, express_validator_1.body)("package_content.*.price")
    .notEmpty()
    .withMessage(error_list_1.default["Package item price required"]), error_helper_1.default.intercept, productPackageController.create);
router.put("/", (0, express_validator_1.body)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("price").notEmpty().withMessage(error_list_1.default["Price is required"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Package name required"]), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage(error_list_1.default["Package description required"]), error_helper_1.default.intercept, productPackageController.update);
router.put("/price-sales", (0, express_validator_1.body)("items").isArray().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("items.*.package_code_id")
    .notEmpty()
    .withMessage(error_list_1.default["Package ID is required"]), (0, express_validator_1.body)("items.*.price").notEmpty().withMessage(error_list_1.default["Price is required"]), (0, express_validator_1.body)("items.*.price")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Price must be numeric"]), error_helper_1.default.intercept, productPackageController.updateSalesPrice);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productPackageController.fetchByID);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, productPackageController.delete);
router.get("/", productPackageController.fetch);
exports.default = router;
//# sourceMappingURL=product-package.route.js.map