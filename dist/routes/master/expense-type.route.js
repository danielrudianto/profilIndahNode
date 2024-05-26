"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const expense_type_controller_1 = __importDefault(require("../../controller/expense-type.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/autocomplete", expense_type_controller_1.default.fetchAutocomplete);
router.get("/children/:id", expense_type_controller_1.default.fetchChildren);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_type_controller_1.default.fetchByID);
router.get("/", expense_type_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_type_controller_1.default.create);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_type_controller_1.default.deleteByID);
router.put("/", (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expense_type_controller_1.default.updateByID);
exports.default = router;
//# sourceMappingURL=expense-type.route.js.map