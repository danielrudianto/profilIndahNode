"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const expense_controller_1 = __importDefault(require("../../controller/expense.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const expense_repository_1 = require("../../repositories/expense.repository");
const company_repository_1 = require("../../repositories/company.repository");
const expense_type_repository_1 = require("../../repositories/expense-type.repository");
const router = (0, express_1.Router)();
const expenseController = new expense_controller_1.default(new expense_repository_1.ExpenseRepository(database_helper_1.prisma), new company_repository_1.CompanyRepository(database_helper_1.prisma), new expense_type_repository_1.ExpenseTypeRepository(database_helper_1.prisma));
const idParam = [
    (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]),
];
const yearMonthParams = [
    (0, express_validator_1.param)("year").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.param)("year").isNumeric().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.param)("month").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.param)("month").isNumeric().withMessage(error_list_1.default["Parameter error"]),
];
const expenseBody = [
    (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("description").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("value").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("value").isNumeric().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("company_id").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("company_id").isNumeric().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("expense_type_id").notEmpty().withMessage(error_list_1.default["Parameter error"]),
];
// Routes
router.get("/", (0, express_validator_1.query)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.query)("month")
    .isInt({ min: 0, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.query)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.query)("year").isNumeric().withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, expenseController.fetchReport);
router.get("/mutation", (0, express_validator_1.query)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.query)("month").isNumeric().withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.query)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.query)("year").isNumeric().withMessage(error_list_1.default["Year must be numeric"]), error_helper_1.default.intercept, expenseController.fetch);
router.get("/:id", ...idParam, error_helper_1.default.intercept, expenseController.fetchByID);
router.post("/", ...expenseBody, error_helper_1.default.intercept, expenseController.create);
router.put("/", ...expenseBody, (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, expenseController.update);
router.delete("/:id", ...idParam, error_helper_1.default.intercept, expenseController.delete);
exports.default = router;
//# sourceMappingURL=expense.route.js.map