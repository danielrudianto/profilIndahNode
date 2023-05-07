"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const expense_controller_1 = __importDefault(require("../../controller/expense.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_controller_1.default.fetchById);
router.get("/:year/:month", (0, express_validator_1.param)("year").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("month").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("value").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("expense_type_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_controller_1.default.create);
router.put("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("value").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("expense_type_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_controller_1.default.update);
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_controller_1.default.deleteById);
exports.default = router;
