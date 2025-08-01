"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const adjustment_case_controller_1 = __importDefault(require("../../controller/adjustment-case.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const auth_helper_1 = require("../../helper/auth.helper");
const adjustment_case_repository_1 = require("../../repositories/adjustment-case.repository");
const database_helper_1 = require("../../helper/database.helper");
const stock_repository_1 = require("../../repositories/stock.repository");
const stock_in_repository_1 = require("../../repositories/stock-in.repository");
const stock_out_repository_1 = require("../../repositories/stock-out.repository");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const router = (0, express_1.Router)();
const adjustmentCaseController = new adjustment_case_controller_1.default(new adjustment_case_repository_1.AdjustmentCaseRepository(database_helper_1.prisma), new stock_repository_1.StockRepository(database_helper_1.prisma), new stock_in_repository_1.StockInRepository(database_helper_1.prisma), new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
router.get("/archives", error_helper_1.default.intercept, adjustmentCaseController.fetchAnnualArchives);
router.post("/archives", (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({ min: 2000 })
    .withMessage(error_list_1.default["Year must be numeric"]), (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("isConfirm").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isReject").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isPending").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isLost")
    .isBoolean()
    .withMessage(error_list_1.default["Adjustment case lost type must be boolean"]), (0, express_validator_1.body)("isFound")
    .isBoolean()
    .withMessage(error_list_1.default["Adjustment case found type must be boolean"]), (0, express_validator_1.body)("sortBy").notEmpty().withMessage(error_list_1.default["Sort by required"]), (0, express_validator_1.body)("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(error_list_1.default["Sort direction only supports ascending or descending"]), error_helper_1.default.intercept, adjustmentCaseController.fetchArchives);
router.post("/approve", auth_helper_1.superadministratorMiddleware, (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt({ min: 0 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, adjustmentCaseController.approve);
router.post("/reject", auth_helper_1.superadministratorMiddleware, (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt({ min: 0 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, adjustmentCaseController.reject);
router.get("/unconfirmed", adjustmentCaseController.fetchUnconfirmed);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, adjustmentCaseController.fetchByID);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("type")
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["Adjustment case type is required"]), (0, express_validator_1.body)("adjustment_case").isArray().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("adjustment_case.*.product_id")
    .notEmpty()
    .withMessage(error_list_1.default["Product ID is required"]), (0, express_validator_1.body)("adjustment_case.*.quantity")
    .notEmpty()
    .withMessage(error_list_1.default["Quantity is required"]), (0, express_validator_1.body)("adjustment_case.*.quantity")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Quantity must be numeric"]), (0, express_validator_1.body)("adjustment_case.*.product_unit_id")
    .exists()
    .withMessage(error_list_1.default["Product unit ID is required"]), error_helper_1.default.intercept, adjustmentCaseController.create);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, adjustmentCaseController.delete);
exports.default = router;
//# sourceMappingURL=adjustment-case.route.js.map