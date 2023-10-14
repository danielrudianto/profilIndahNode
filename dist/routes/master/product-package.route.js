"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_package_controller_1 = __importDefault(require("../../controller/product-package.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.post("/", (0, express_validator_1.body)("price").notEmpty().withMessage(error_list_1.default["Price is required"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Package name required"]), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage(error_list_1.default["Package description required"]), 
// Body items is an array of object
// Each object has item_id, item_unit_id, and quantity
// item_id and quantity is required
(0, express_validator_1.body)("package_content")
    .notEmpty()
    .withMessage(error_list_1.default["Package items required"]), error_helper_1.default.intercept, product_package_controller_1.default.create);
router.put("/", (0, express_validator_1.body)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("price").notEmpty().withMessage(error_list_1.default["Price is required"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Package name required"]), (0, express_validator_1.body)("description")
    .notEmpty()
    .withMessage(error_list_1.default["Package description required"]), error_helper_1.default.intercept, product_package_controller_1.default.update);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_package_controller_1.default.fetchByID);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_package_controller_1.default.delete);
router.get("/", product_package_controller_1.default.fetch);
exports.default = router;
