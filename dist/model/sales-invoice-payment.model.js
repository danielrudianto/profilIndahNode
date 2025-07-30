"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoicePaymentModel = void 0;
const payment_method_model_1 = require("./payment-method.model");
class SalesInvoicePaymentModel {
    constructor(data) {
        this.id = data.id;
        this.sales_invoice_code_id = data.sales_invoice_code_id;
        this.payment_method_id = data.payment_method_id;
        this.value = data.value;
        this.date = data.date;
        this.is_paid = data.is_paid;
        this.payment_method = payment_method_model_1.PaymentMethodViewModel.fromMap(data.payment_method);
    }
    static fromMap(data) {
        return new SalesInvoicePaymentModel({
            id: data.id,
            sales_invoice_code_id: data.sales_invoice_code_id,
            payment_method_id: data.payment_method_id,
            value: Number(data.value),
            date: new Date(data.date),
            payment_method: data.payment_method == undefined
                ? undefined
                : data.payment_method == null
                    ? null
                    : payment_method_model_1.PaymentMethodViewModel.fromMap(data.payment_method),
        });
    }
}
exports.SalesInvoicePaymentModel = SalesInvoicePaymentModel;
//# sourceMappingURL=sales-invoice-payment.model.js.map