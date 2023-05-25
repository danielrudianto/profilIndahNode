"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const sales_invoice_controller_1 = __importDefault(require("../../controller/sales-invoice.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.post("/search", sales_invoice_controller_1.default.search);
router.post("/", (0, express_validator_1.body)("customer_id").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("payment_method_id").exists().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("discount")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("delivery")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("service")
    .toInt()
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_invoice_controller_1.default.create);
router.get("/archives", sales_invoice_controller_1.default.fetchArchive);
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_invoice_controller_1.default.fetchById);
router.delete("/:id", auth_helper_1.administratorMiddleware, (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_invoice_controller_1.default.deleteById);
exports.default = router;
