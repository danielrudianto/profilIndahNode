"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const company_model_1 = require("./company.model");
const product_model_1 = require("./product.model");
const product_unit_model_1 = require("./product-unit.model");
const supplier_model_1 = __importDefault(require("./supplier.model"));
const user_model_1 = require("./user.model");
class GoodReceiptModel {
    constructor(data) {
        this.id = data.id;
        this.uuid = data.uuid;
        this.name = data.name;
        this.invoice_name = data.invoice_name;
        this.faktur = data.faktur;
        this.discount = data.discount;
        this.date = data.date;
        this.supplier_id = data.supplier_id;
        this.company_id = data.company_id;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.good_receipt = data.good_receipt;
        this.company = data.company;
        this.supplier = data.supplier;
        this.user_good_receipt_code_created_byTouser =
            data.user_good_receipt_code_created_byTouser;
        this.user_good_receipt_code_confirmed_byTouser =
            data.user_good_receipt_code_confirmed_byTouser;
        this.is_confirm = data.is_confirm;
        this.is_delete = data.is_delete;
    }
    static fromMap(data) {
        return new GoodReceiptModel({
            id: data.id,
            uuid: data.uuid,
            name: data.name,
            invoice_name: data.invoice_name,
            faktur: data.faktur,
            discount: data.discount,
            date: data.date,
            supplier_id: data.supplier_id,
            company_id: data.company_id,
            created_by: data.created_by,
            created_at: data.created_at,
            is_confirm: data.is_confirm,
            is_delete: data.is_delete,
            good_receipt: data.good_receipt == undefined
                ? undefined
                : data.good_receipt.map((item) => ({
                    id: item.id,
                    product_id: item.product_id,
                    product_unit_id: item.product_unit_id,
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                    discount: Number(item.discount),
                    product: item.product == undefined
                        ? undefined
                        : product_model_1.ProductModel.fromMap(item.product),
                    product_unit: item.product_unit == undefined
                        ? undefined
                        : item.product_unit == null
                            ? null
                            : product_unit_model_1.ProductUnitModel.fromMap(item.product_unit),
                })),
            company: data.company == undefined ? undefined : new company_model_1.CompanyModel(data.company),
            supplier: data.supplier == undefined
                ? undefined
                : new supplier_model_1.default(data.supplier),
            user_good_receipt_code_created_byTouser: data.user_good_receipt_code_created_byTouser == undefined
                ? undefined
                : user_model_1.UserViewModel.fromMap(data.user_good_receipt_code_created_byTouser),
            user_good_receipt_code_confirmed_byTouser: data.user_good_receipt_code_confirmed_byTouser == undefined
                ? undefined
                : data.user_good_receipt_code_confirmed_byTouser == null
                    ? null
                    : user_model_1.UserViewModel.fromMap(data.user_good_receipt_code_confirmed_byTouser),
        });
    }
}
exports.default = GoodReceiptModel;
//# sourceMappingURL=good-receipt.model.js.map