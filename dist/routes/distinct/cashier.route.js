"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = __importDefault(require("../../controller/user.controller"));
const sales_invoice_controller_1 = __importDefault(require("../../controller/sales-invoice.controller"));
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const draft_bill_controller_1 = __importDefault(require("../../controller/draft-bill.controller"));
const user_repository_1 = require("../../repositories/user.repository");
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const customer_repository_1 = require("../../repositories/customer.repository");
const database_helper_1 = require("../../helper/database.helper");
const router = (0, express_1.Router)();
const userController = new user_controller_1.default(new user_repository_1.UserRepository(database_helper_1.prisma), new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new customer_repository_1.CustomerRepository(database_helper_1.prisma));
// router.get("/payment-method", PaymentMethodController.fetchAll);
router.get("/", userController.fetchStatistics);
router.get("/bill/:otc", (0, express_validator_1.param)("otc").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_invoice_controller_1.default.fetchByOTC);
router.post("/bill/delete", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt().withMessage(error_list_1.default["ID is required"]), error_helper_1.default.intercept, draft_bill_controller_1.default.deleteByID);
router.post("/bill/confirm", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("id").isInt().withMessage(error_list_1.default["ID is required"]), error_helper_1.default.intercept, draft_bill_controller_1.default.confirmByID);
exports.default = router;
//# sourceMappingURL=cashier.route.js.map