"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const expense_type_controller_1 = __importDefault(require("../../controller/expense-type.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const expense_type_repository_1 = require("../../repositories/expense-type.repository");
const router = (0, express_1.Router)();
const expenseTypeController = new expense_type_controller_1.default(new expense_type_repository_1.ExpenseTypeRepository(database_helper_1.prisma));
router.get("/autocomplete", expenseTypeController.fetchAutocomplete);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be integer"]), error_helper_1.default.intercept, expenseTypeController.fetchByID);
router.get("/", expenseTypeController.fetch);
router.post("/", (0, express_validator_1.body)("name")
    .not()
    .isEmpty()
    .withMessage(error_list_1.default["Expense type name is required"]), (0, express_validator_1.body)("description")
    .not()
    .isEmpty()
    .withMessage(error_list_1.default["Expense type description is required"]), error_helper_1.default.intercept, expenseTypeController.create);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be integer"]), error_helper_1.default.intercept, expenseTypeController.delete);
router.put("/", (0, express_validator_1.body)("name")
    .not()
    .isEmpty()
    .withMessage(error_list_1.default["Expense type name is required"]), (0, express_validator_1.body)("description")
    .not()
    .isEmpty()
    .withMessage(error_list_1.default["Expense type description is required"]), (0, express_validator_1.body)("id").isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be integer"]), error_helper_1.default.intercept, expenseTypeController.update);
exports.default = router;
//# sourceMappingURL=expense-type.route.js.map