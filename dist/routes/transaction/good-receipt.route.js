"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const good_receipt_controller_1 = __importDefault(require("../../controller/good-receipt.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const auth_helper_1 = require("../../helper/auth.helper");
const good_receipt_repository_1 = require("../../repositories/good-receipt.repository");
const database_helper_1 = require("../../helper/database.helper");
const stock_in_repository_1 = require("../../repositories/stock-in.repository");
const stock_repository_1 = require("../../repositories/stock.repository");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const router = (0, express_1.Router)();
const goodReceiptController = new good_receipt_controller_1.default(new good_receipt_repository_1.GoodReceiptRepository(database_helper_1.prisma), new stock_in_repository_1.StockInRepository(database_helper_1.prisma), new stock_repository_1.StockRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma));
router.get("/archives", goodReceiptController.fetchAnnualArchives);
router.post("/archives", (0, express_validator_1.body)("year").notEmpty().withMessage(error_list_1.default["Year is required"]), (0, express_validator_1.body)("year")
    .isInt({ min: 2000 })
    .withMessage(error_list_1.default["Year must be numeric"]), (0, express_validator_1.body)("month").notEmpty().withMessage(error_list_1.default["Month is required"]), (0, express_validator_1.body)("month")
    .isInt({ min: 1, max: 12 })
    .withMessage(error_list_1.default["Month must be numeric"]), (0, express_validator_1.body)("isActive").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isDelete").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("isPending").isBoolean().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("sortBy").notEmpty().withMessage(error_list_1.default["Sort by required"]), (0, express_validator_1.body)("sortDirection")
    .isIn(["asc", "desc"])
    .withMessage(error_list_1.default["Sort direction only supports ascending or descending"]), error_helper_1.default.intercept, goodReceiptController.fetchArchives);
router.post("/check", (0, express_validator_1.body)("name").exists().withMessage(error_list_1.default["Name required"]), error_helper_1.default.intercept, goodReceiptController.check);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("company_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("supplier_id").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, auth_helper_1.putriForbiddenMiddleware, goodReceiptController.create);
router.get("/unconfirmed", goodReceiptController.fetchUnconfirmed);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, goodReceiptController.fetchByID);
router.put("/confirm", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Name required"]), (0, express_validator_1.body)("invoice_name")
    .notEmpty()
    .withMessage(error_list_1.default["Invoice name required"]), (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("faktur").exists().withMessage(error_list_1.default["Tax invoice required"]), (0, express_validator_1.body)("good_receipt")
    .isArray()
    .withMessage(error_list_1.default["Good receipt must be array"]), (0, express_validator_1.body)("good_receipt.*.id")
    .notEmpty()
    .withMessage(error_list_1.default["Good receipt ID required"]), (0, express_validator_1.body)("good_receipt.*.price")
    .notEmpty()
    .withMessage(error_list_1.default["Price is required"]), (0, express_validator_1.body)("good_receipt.*.price")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Price must be numeric"]), (0, express_validator_1.body)("good_receipt.*.discount")
    .notEmpty()
    .withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("good_receipt.*.discount")
    .isFloat({ min: 0 })
    .withMessage(error_list_1.default["Discount must be numeric"]), error_helper_1.default.intercept, goodReceiptController.confirm);
router.put("/reject", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, goodReceiptController.reject);
exports.default = router;
//# sourceMappingURL=good-receipt.route.js.map