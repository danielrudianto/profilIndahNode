"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
class BillController {
    constructor() {
        this.create = (req, res) => {
            const validation_result = (0, express_validator_1.validationResult)(req);
            if (!validation_result.isEmpty()) {
                return res.status(400).send(validation_result.array()[0].msg);
            }
            const customer_id = req.body.customer_id;
            const payment_method_id = req.body.payment_method_id;
            const discount = parseFloat(req.body.discount);
            const delivery = parseFloat(req.body.delivery);
            const bill = req.body.bill;
            bill.forEach(bill_item => {
            });
            const bill_code = new bill_code_model_1.default(customer_id, req.body.userId, payment_method_id, discount, delivery);
            bill_code.create().then(result => {
                // Insert bill
            }).catch(error => {
                return res.status(500).send(error);
            });
        };
    }
}
exports.default = BillController;
