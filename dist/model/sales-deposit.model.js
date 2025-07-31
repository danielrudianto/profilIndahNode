"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesDepositModel = void 0;
const customer_model_1 = require("../model/customer.model");
const product_unit_model_1 = require("../model/product-unit.model");
const product_model_1 = require("../model/product.model");
const user_model_1 = require("../model/user.model");
const payment_method_model_1 = require("./payment-method.model");
const sales_deposit_payment_model_1 = require("./sales-deposit-payment.model");
class SalesDepositModel {
    constructor(data) {
        this.sales_deposit = [];
        this.sales_deposit_payment = [];
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
        this.isConfirm = data.isConfirm;
        this.confirmedBy = data.confirmedBy;
        this.confirmedAt = data.confirmedAt;
        this.uuid = data.uuid;
        this.isPaid = data.isPaid;
        this.sales = data.sales || null;
        this.isDelete = data.isDelete;
        this.type = data.type;
        this.sales_deposit = data.sales_deposit;
        this.sales_deposit_payment = data.sales_deposit_payment;
        this.customer = data.customer;
        this.user_bill_code_created_byTouser = data.user_bill_code_created_byTouser;
        this.user_bill_code_confirmed_byTouser =
            data.user_bill_code_confirmed_byTouser;
    }
    static fromMap(data) {
        return new SalesDepositModel({
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
            type: data.type,
            sales_deposit: data.sales_deposit == undefined
                ? []
                : data.sales_deposit.map((item) => {
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
            sales_deposit_payment: data.sales_deposit_payment == undefined
                ? undefined
                : data.sales_deposit_payment.map((x) => {
                    return new sales_deposit_payment_model_1.SalesDepositPaymentModel({
                        id: x.id,
                        date: new Date(x.date),
                        value: Number(x.value),
                        payment_method_id: x.payment_method_id,
                        payment_method: x.payment_method == undefined
                            ? undefined
                            : x.payment_method == null
                                ? null
                                : new payment_method_model_1.PaymentMethodViewModel({
                                    id: x.payment_method_id,
                                    name: x.payment_method.name,
                                    description: x.payment_method.description,
                                }),
                        sales_deposit_code_id: data.id,
                    });
                }),
            customer: data.customer == null
                ? null
                : data.customer == undefined
                    ? undefined
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
exports.SalesDepositModel = SalesDepositModel;
//# sourceMappingURL=sales-deposit.model.js.map