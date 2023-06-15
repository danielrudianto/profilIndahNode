"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const draft_bill_controller_1 = __importDefault(require("../../controller/draft-bill.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.post("/order", draft_bill_controller_1.default.order);
router.post("/", (0, express_validator_1.body)("customer_id").exists().withMessage("Please fill in customer ID"), (0, express_validator_1.body)("note").exists().withMessage("Please fill in note"), (0, express_validator_1.body)("items").exists().withMessage("Please fill in items"), (0, express_validator_1.body)("service").exists().withMessage("Please fill in the service value"), (0, express_validator_1.body)("delivery").exists().withMessage("Please fill in the delivery value"), error_helper_1.default.intercept, draft_bill_controller_1.default.create);
exports.default = router;
