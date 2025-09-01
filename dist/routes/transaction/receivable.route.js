"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const receivable_controller_1 = __importDefault(require("../../controller/receivable.controller"));
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const receivable_repository_1 = require("../../repositories/receivable.repository");
const redis_helper_1 = require("../../helper/redis.helper");
const database_helper_1 = require("../../helper/database.helper");
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const router = (0, express_1.Router)();
const receivableController = new receivable_controller_1.default(new receivable_repository_1.ReceivableRepository(redis_helper_1.redisClient, database_helper_1.prisma), new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma));
router.get("/", receivableController.fetch);
router.get("/history/:id", receivable_controller_1.default.fetchPaymentsHistory);
router.get("/customer/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Customer ID is required"]), (0, express_validator_1.param)("id")
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["CUstomer ID must be integer"]), error_helper_1.default.intercept, receivableController.fetchByCustomerID);
router.post("/payment", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("amount").notEmpty().withMessage(error_list_1.default["Amount is required"]), (0, express_validator_1.body)("amount")
    .isFloat({
    min: 0,
})
    .withMessage(error_list_1.default["Amount must be numeric"]), (0, express_validator_1.body)("full_payment")
    .isBoolean()
    .withMessage(error_list_1.default["Payment status required"]), (0, express_validator_1.body)("payment_method_id")
    .exists()
    .withMessage(error_list_1.default["Payment method required"]), error_helper_1.default.intercept, receivableController.createPayment);
router.delete("/:id", receivable_controller_1.default.deletePayment);
exports.default = router;
//# sourceMappingURL=receivable.route.js.map