"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const sales_deposit_controller_1 = require("../../controller/sales-deposit.controller");
const database_helper_1 = require("../../helper/database.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const redis_helper_1 = require("../../helper/redis.helper");
const overpayment_repository_1 = require("../../repositories/overpayment.repository");
const receivable_repository_1 = require("../../repositories/receivable.repository");
const sales_deposit_repository_1 = require("../../repositories/sales-deposit.repository");
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const stock_card_repository_1 = require("../../repositories/stock-card.repository");
const stock_out_repository_1 = require("../../repositories/stock-out.repository");
const stock_repository_1 = require("../../repositories/stock.repository");
const router = (0, express_1.Router)();
const salesDepositController = new sales_deposit_controller_1.SalesDepositController(new sales_deposit_repository_1.SalesDepositRepository(database_helper_1.prisma), new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new stock_card_repository_1.StockCardRepository(database_helper_1.prisma), new stock_repository_1.StockRepository(database_helper_1.prisma), new stock_out_repository_1.StockOutRepository(database_helper_1.prisma), new receivable_repository_1.ReceivableRepository(redis_helper_1.redisClient, database_helper_1.prisma), new overpayment_repository_1.OverpaymentRepository(database_helper_1.prisma));
router.get("/archives", salesDepositController.fetchAnnualArchives);
router.post("/archives", salesDepositController.fetchArchives);
router.post("/confirm", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["ID must be numeric"]), (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("sales_invoice_payment")
    .notEmpty()
    .withMessage(error_list_1.default["Payment is required"]), (0, express_validator_1.body)("sales_invoice_payment")
    .isArray()
    .withMessage(error_list_1.default["Payment must be an array"]), (0, express_validator_1.body)("sales_invoice_payment.*.payment_method_id")
    .exists()
    .withMessage(error_list_1.default["Payment method required"]), (0, express_validator_1.body)("sales_invoice_payment.*.value")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Amount must be numeric"]), (0, express_validator_1.body)("sales_invoice_payment.*.date")
    .notEmpty()
    .withMessage(error_list_1.default["Payment date is required"]), error_helper_1.default.intercept, salesDepositController.confirm);
router.post("/delete");
router.post("/", (0, express_validator_1.body)("uuid").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("customer_id")
    .exists()
    .withMessage(error_list_1.default["Customer ID is required"]), (0, express_validator_1.body)("discount").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("discount")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("delivery").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("delivery")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("service").notEmpty().withMessage(error_list_1.default["Discount required"]), (0, express_validator_1.body)("service")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Discount must be numeric"]), (0, express_validator_1.body)("is_paid")
    .isBoolean()
    .withMessage(error_list_1.default["Payment status is required"]), (0, express_validator_1.body)("type")
    .isIn(["INTERNAL", "EXTERNAL"])
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, salesDepositController.create);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, salesDepositController.fetchByID);
router.get("/", salesDepositController.fetch);
// router.get("/v2", DepositController.fetchV2);
// router.get("/:id", depositController.fetchByID);
// router.get("/", depositController.fetch);
// router.post("/", depositController.create);
// // router.post("/confirm", DepositController.confirmByID);
// router.post("/archives", DepositController.fetchArchive);
// router.delete("/:id", DepositController.deleteByID);
exports.default = router;
//# sourceMappingURL=sales-deposit.route.js.map