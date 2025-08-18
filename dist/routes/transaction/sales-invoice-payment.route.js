"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const sales_invoice_payment_controller_1 = require("../../controller/sales-invoice-payment.controller");
const database_helper_1 = require("../../helper/database.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const redis_helper_1 = require("../../helper/redis.helper");
const receivable_repository_1 = require("../../repositories/receivable.repository");
const sales_invoice_payment_repository_1 = require("../../repositories/sales-invoice-payment.repository");
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const router = (0, express_1.Router)();
const salesInvoicePaymentController = new sales_invoice_payment_controller_1.SalesInvoicePaymentController(new sales_invoice_payment_repository_1.SalesInvoicePaymentRepository(database_helper_1.prisma), new receivable_repository_1.ReceivableRepository(redis_helper_1.redisClient, database_helper_1.prisma), new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma));
router.post("/", (0, express_validator_1.body)("sales_invoice_code_id")
    .notEmpty()
    .withMessage(error_list_1.default["Sales invoice ID is required"]), (0, express_validator_1.body)("sales_invoice_code_id")
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["Sales invoice ID must be numeric"]), (0, express_validator_1.body)("payment_method_id")
    .exists()
    .withMessage(error_list_1.default["Payment method required"]), (0, express_validator_1.body)("value").notEmpty().withMessage(error_list_1.default["Amount is required"]), (0, express_validator_1.body)("value")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Amount must be numeric"]), (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), error_helper_1.default.intercept, salesInvoicePaymentController.create);
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, salesInvoicePaymentController.delete);
exports.default = router;
//# sourceMappingURL=sales-invoice-payment.route.js.map