"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesInvoiceItemModel = exports.SalesInvoiceModel = void 0;
const product_model_1 = require("./product.model");
const customer_model_1 = require("./customer.model");
const sales_invoice_payment_model_1 = require("./sales-invoice-payment.model");
const product_unit_model_1 = require("./product-unit.model");
const user_model_1 = require("./user.model");
const payment_method_model_1 = require("./payment-method.model");
class SalesInvoiceModel {
    constructor(data) {
        this.payment_term = null;
        this.sales_invoice = [];
        this.sales_invoice_payment = [];
        this.id = data.id;
        this.name = data.name;
        this.customerID = data.customerID;
        this.customer = data.customer;
        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt;
        this.discount = data.discount;
        this.delivery = data.delivery;
        this.service = data.service;
        this.date = data.date;
        this.is_confirm = data.isConfirm;
        this.confirmedBy = data.confirmedBy;
        this.confirmedAt = data.confirmedAt;
        this.uuid = data.uuid;
        this.isPaid = data.isPaid;
        this.sales = data.sales;
        this.isDelete = data.isDelete;
        this.sales_invoice = data.sales_invoice;
        this.sales_invoice_payment = data.sales_invoice_payment;
        this.customer = data.customer;
        this.user_bill_code_created_byTouser = data.user_bill_code_created_byTouser;
        this.user_bill_code_confirmed_byTouser =
            data.user_bill_code_confirmed_byTouser;
    }
    static fromMap(data) {
        return new SalesInvoiceModel({
            id: data.id,
            name: data.name,
            date: data.date,
            discount: Number(data.discount),
            delivery: Number(data.delivery),
            service: Number(data.service),
            sales: data.sales,
            customerID: data.customer_id,
            createdBy: data.created_by,
            createdAt: new Date(data.created_at),
            isConfirm: data.is_confirm,
            confirmedBy: data.confirmed_by,
            confirmedAt: data.confirmed_at,
            isPaid: data.is_paid,
            isDelete: data.is_delete,
            uuid: data.uuid,
            sales_invoice: data.sales_invoice == undefined
                ? []
                : data.sales_invoice.map((item) => {
                    return {
                        id: item.id,
                        product_id: item.product_id,
                        product_unit_id: item.product_unit_id,
                        quantity: Number(item.quantity),
                        price: Number(item.price),
                        discount: Number(item.discount),
                        product: item.product == undefined
                            ? undefined
                            : product_model_1.ProductModel.fromMap(item.product),
                        product_unit: item.product_unit == null
                            ? null
                            : item.product_unit == undefined
                                ? undefined
                                : product_unit_model_1.ProductUnitModel.fromMap(item.product_unit),
                    };
                }),
            sales_invoice_payment: data.sales_invoice_payment == undefined
                ? undefined
                : data.sales_invoice_payment.map((x) => {
                    return new sales_invoice_payment_model_1.SalesInvoicePaymentModel({
                        id: x.id,
                        date: new Date(x.date),
                        payment_method_id: x.payment_method_id,
                        value: Number(x.value),
                        payment_method: x.payment_method_id == null
                            ? null
                            : new payment_method_model_1.PaymentMethodViewModel({
                                id: x.payment_method_id,
                                name: x.payment_method.name,
                                description: x.payment_method.description,
                            }),
                        sales_invoice_code_id: data.id,
                    });
                }),
            customer: data.customer == undefined
                ? undefined
                : data.customer == null
                    ? null
                    : customer_model_1.CustomerModel.fromMap(data.customer),
            user_bill_code_created_byTouser: data.user_bill_code_created_byTouser == undefined
                ? undefined
                : user_model_1.UserViewModel.fromMap(data.user_bill_code_created_byTouser),
            user_bill_code_confirmed_byTouser: data.user_bill_code_confirmed_byTouser == undefined
                ? undefined
                : data.user_bill_code_confirmed_byTouser == null
                    ? null
                    : user_model_1.UserViewModel.fromMap(data.user_bill_code_confirmed_byTouser),
        });
    }
}
exports.SalesInvoiceModel = SalesInvoiceModel;
class SalesInvoiceItemModel {
    constructor(data) {
        this.id = data.id;
        this.product_id = data.product_id;
        this.product_unit_id = data.product_unit_id;
        this.quantity = data.quantity;
        this.price = data.price;
        this.discount = data.discount;
        this.product = data.product;
        this.product_unit = data.product_unit;
    }
    static fromMap(data) {
        const result = new SalesInvoiceItemModel({
            id: data.id,
            product_id: data.product_id,
            product_unit_id: data.product_unit_id,
            quantity: Number(data.quantity),
            price: Number(data.price),
            discount: Number(data.discount),
            product: data.product == undefined
                ? undefined
                : product_model_1.ProductModel.fromMap(data.product),
            product_unit: data.product_unit == null
                ? null
                : data.product_unit == undefined
                    ? undefined
                    : product_unit_model_1.ProductUnitModel.fromMap(data.product_unit),
        });
        console.log(result.product_unit);
        return result;
    }
}
exports.SalesInvoiceItemModel = SalesInvoiceItemModel;
//# sourceMappingURL=sales-invoice.model.js.map