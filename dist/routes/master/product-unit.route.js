"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_unit_controller_1 = __importDefault(require("../../controller/product-unit.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_unit_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("item_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("item_unit").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_unit_controller_1.default.create);
router.get("/sales-price/:id", product_unit_controller_1.default.fetchByID);
exports.default = router;
//# sourceMappingURL=product-unit.route.js.map