"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const product_stock_controller_1 = __importDefault(require("../../controller/product-stock.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/meta/:id", (0, express_validator_1.param)("id").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_stock_controller_1.default.fetchMetaByID);
router.get("/:id", (0, express_validator_1.param)("id").exists().isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_stock_controller_1.default.fetchByID);
router.get("/", (0, express_validator_1.query)("mode").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_stock_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("mode").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, product_stock_controller_1.default.create);
exports.default = router;
//# sourceMappingURL=stock.route.js.map