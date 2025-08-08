"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverpaymentModel = exports.OverpaymentCodeModel = void 0;
const customer_model_1 = require("./customer.model");
const payment_method_model_1 = require("./payment-method.model");
const user_model_1 = require("./user.model");
class OverpaymentCodeModel {
    constructor(data) {
        this.id = data.id;
        this.customer_id = data.customer_id;
        this.date = data.date;
        this.sales_deposit_code_id = data.sales_deposit_code_id;
        this.payment_method_id = data.payment_method_id;
        this.return_payment_method = data.return_payment_method;
        this.return_payment_number = data.return_payment_number;
        this.return_payment_date = data.return_payment_date;
        this.return_payment_bank = data.return_payment_bank;
        this.return_payment_name = data.return_payment_name;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.value = data.value;
        this.customer = data.customer;
        this.user_overpayment_created_byTouser =
            data.user_overpayment_created_byTouser;
        this.payment_method = data.payment_method;
    }
    static fromMap(data) {
        return new OverpaymentCodeModel({
            id: data.id,
            customer_id: data.customer_id,
            date: new Date(data.date),
            sales_deposit_code_id: data.sales_deposit_code_id,
            payment_method_id: data.payment_method_id,
            return_payment_method: data.return_payment_method,
            return_payment_date: new Date(data.return_payment_date),
            return_payment_bank: data.return_payment_bank,
            return_payment_name: data.return_payment_name,
            return_payment_number: data.return_payment_number,
            created_by: data.created_by,
            created_at: new Date(data.created_at),
            value: Number(data.value),
            customer: data.customer == null
                ? null
                : data.customer == undefined
                    ? undefined
                    : customer_model_1.CustomerModel.fromMap(data.customer),
            user_overpayment_created_byTouser: data.user_overpayment_created_byTouser == undefined
                ? undefined
                : user_model_1.UserViewModel.fromMap(data.user_overpayment_created_byTouser),
            payment_method: data.payment_method == null
                ? null
                : data.payment_method == undefined
                    ? undefined
                    : payment_method_model_1.PaymentMethodModel.fromMap(data.payment_method),
        });
    }
}
exports.OverpaymentCodeModel = OverpaymentCodeModel;
class OverpaymentModel {
    constructor(data) {
        this.id = data.id;
        this.payment_method_id = data.payment_method_id;
        this.value = data.value;
        this.overpayment_code_id = data.overpayment_code_id;
        this.payment_method = data.payment_method;
    }
}
exports.OverpaymentModel = OverpaymentModel;
//# sourceMappingURL=overpayment.model.js.map