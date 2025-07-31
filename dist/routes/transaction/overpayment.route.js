"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const overpayment_controller_1 = require("../../controller/overpayment.controller");
const database_helper_1 = require("../../helper/database.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const overpayment_repository_1 = require("../../repositories/overpayment.repository");
const router = (0, express_1.Router)();
const overpaymentContorller = new overpayment_controller_1.OverpaymentController(new overpayment_repository_1.OverpaymentRepository(database_helper_1.prisma));
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("value").notEmpty().withMessage(error_list_1.default["Amount is required"]), (0, express_validator_1.body)("value")
    .isFloat({
    min: 0.1,
})
    .withMessage(error_list_1.default["Amount must be numeric"]), (0, express_validator_1.body)("customer_id")
    .exists()
    .withMessage(error_list_1.default["Customer ID is required"]), (0, express_validator_1.body)("return_payment_date")
    .notEmpty()
    .withMessage(error_list_1.default["Return date is required"]), (0, express_validator_1.body)("return_payment_method")
    .isIn(["Cash", "Bank transfer"])
    .withMessage(error_list_1.default["Return payment method must be either Cash or Transfer"]), (0, express_validator_1.body)("return_payment_name")
    .notEmpty()
    .withMessage(error_list_1.default["Return name is required"]), (0, express_validator_1.body)("return_payment_bank")
    .exists()
    .withMessage(error_list_1.default["Return payment bank is required"]), (0, express_validator_1.body)("return_payment_number")
    .exists()
    .withMessage(error_list_1.default["Return payment number is required"]), error_helper_1.default.intercept, overpaymentContorller.create);
exports.default = router;
//# sourceMappingURL=overpayment.route.js.map