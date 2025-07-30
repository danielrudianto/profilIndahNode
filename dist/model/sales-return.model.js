"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesReturnModel = exports.SalesReturnCodeModel = void 0;
const sales_invoice_model_1 = require("./sales-invoice.model");
class SalesReturnCodeModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.date = data.date;
        this.payment_method_id = data.payment_method_id;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.is_confirm = data.is_confirm;
        this.is_delete = data.is_delete;
        this.confirmed_at = data.confirmed_at;
        this.confirmed_by = data.confirmed_by;
        this.sales_invoice_code_id = data.sales_invoice_code_id;
        this.sales_invoice_code = data.sales_invoice_code;
        this.sales_return = data.sales_return;
    }
    static fromMap(data) {
        return new SalesReturnCodeModel({
            id: data.id,
            name: data.name,
            date: new Date(data.date),
            payment_method_id: data.payment_method_id,
            created_by: data.created_by,
            created_at: new Date(data.created_at),
            is_confirm: data.is_confirm,
            is_delete: data.is_delete,
            confirmed_at: new Date(data.confirmed_at),
            confirmed_by: data.confirmed_by,
            sales_invoice_code_id: data.sales_invoice_code_id,
            sales_invoice_code: data.sales_invoice_code == undefined
                ? undefined
                : sales_invoice_model_1.SalesInvoiceModel.fromMap(data.sales_invoice_code),
            sales_return: data.sales_return == undefined
                ? undefined
                : data.sales_return.map((x) => {
                    return {
                        quantity: Number(x.quantity),
                        sales_invoice_id: x.sales_invoice_id,
                        sales_return_code_id: x.sales_invoice_code_id,
                        sales_invoice: x.sales_invoice == undefined
                            ? undefined
                            : sales_invoice_model_1.SalesInvoiceItemModel.fromMap(x.sales_invoice),
                    };
                }),
        });
    }
}
exports.SalesReturnCodeModel = SalesReturnCodeModel;
class SalesReturnModel {
    constructor(data) {
        this.id = data.id;
        this.quantity = data.quantity;
        this.sales_return_code_id = data.sales_return_code_id;
        this.sales_invoice_id = data.sales_invoice_id;
        this.sales_return_code = data.sales_return_code;
        this.sales_invoice = data.sales_invoice;
    }
}
exports.SalesReturnModel = SalesReturnModel;
//# sourceMappingURL=sales-return.model.js.map