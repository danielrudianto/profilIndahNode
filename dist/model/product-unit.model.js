"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductUnitViewModel = exports.ProductUnitModel = exports.ItemUnitMode = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
var ItemUnitMode;
(function (ItemUnitMode) {
    ItemUnitMode[ItemUnitMode["Sales"] = 0] = "Sales";
    ItemUnitMode[ItemUnitMode["Plain"] = 1] = "Plain";
})(ItemUnitMode = exports.ItemUnitMode || (exports.ItemUnitMode = {}));
class ProductUnitModel {
    constructor(data) {
        this.id = data.id;
        this.product_id = data.product_id;
        this.unit = data.unit;
        this.conversion = data.conversion;
        this.is_delete = data.is_delete;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.sales_discount = data.sales_discount;
        this.sales_price = data.sales_price;
        this.purchase_price = data.purchase_price;
        this.purchase_discount = data.purchase_discount;
    }
    static fromMap(data) {
        return new ProductUnitModel({
            id: data.id,
            product_id: data.product_id,
            unit: data.unit,
            conversion: Number(data.conversion),
            is_delete: data.is_delete,
            created_by: data.created_by,
            created_at: data.created_at,
            sales_price: Number(data.sales_price),
            sales_discount: Number(data.sales_discount),
            purchase_price: Number(data.purchase_price),
            purchase_discount: Number(data.purchase_discount),
        });
    }
}
exports.ProductUnitModel = ProductUnitModel;
class ProductUnitViewModel {
    constructor(data) {
        this.id = data.id;
        this.product_id = data.product_id;
        this.unit = data.unit;
        this.conversion = data.conversion;
        this.sales_price = data.sales_price;
        this.sales_discount = data.sales_discount;
        this.purchase_price = data.purchase_price;
        this.purchase_discount = data.purchase_discount;
    }
    static fromMap(data) {
        return {
            id: data.id,
            product_id: data.product_id,
            unit: data.unit,
            conversion: Number(data.conversion),
            sales_price: data.sales_price == undefined ? undefined : Number(data.sales_price),
            sales_discount: data.sales_discount == undefined
                ? undefined
                : Number(data.sales_discount),
            purchase_price: data.purchase_price == undefined
                ? undefined
                : Number(data.purchase_price),
            purchase_discount: data.purchase_discount == undefined
                ? undefined
                : Number(data.purchase_discount),
        };
    }
}
exports.ProductUnitViewModel = ProductUnitViewModel;
//# sourceMappingURL=product-unit.model.js.map