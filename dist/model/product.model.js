"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductStockModel = exports.ItemUnitModel = exports.ProductModel = void 0;
const product_brand_model_1 = require("./product-brand.model");
const product_type_model_1 = require("./product-type.model");
const product_unit_model_1 = require("./product-unit.model");
class ProductModel {
    constructor(data) {
        this.is_active = true;
        this.is_delete = false;
        this.product_unit = [];
        this.id = data.id;
        this.reference = data.reference;
        this.description = data.description;
        this.product_brand_id = data.product_brand_id;
        this.product_type_id = data.product_type_id;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.updated_by = data.updated_by;
        this.updated_at = data.updated_at;
        this.is_active = data.is_active;
        this.is_delete = data.is_delete;
        this.minimum_stock = data.minimum_stock;
        this.unit = data.unit;
        this.product_brand = data.product_brand;
        this.product_type = data.product_type;
        this.is_delete = data.is_delete;
        this.sales_price = data.sales_price;
        this.sales_discount = data.sales_discount;
        this.purchase_price = data.purchase_price;
        this.purchase_discount = data.purchase_discount;
        this.product_unit = data.product_unit;
        this.product_stock = data.product_stock;
    }
    static fromMap(data) {
        return new ProductModel({
            id: data.id,
            reference: data.reference,
            description: data.description,
            product_brand_id: data.product_brand_id,
            product_type_id: data.product_type_id,
            created_by: data.created_by,
            created_at: data.created_at,
            updated_by: data.updated_by,
            updated_at: data.updated_at,
            minimum_stock: Number(data.minimum_stock),
            sales_discount: Number(data.sales_discount),
            sales_price: Number(data.sales_price),
            purchase_discount: Number(data.purchase_discount),
            purchase_price: Number(data.purchase_price),
            unit: data.unit,
            product_brand: data.product_brand == undefined
                ? undefined
                : product_brand_model_1.ProductBrandViewModel.fromMap(data.product_brand),
            product_type: data.product_type == undefined
                ? undefined
                : product_type_model_1.ProductTypeViewModel.fromMap(data.product_type),
            is_delete: data.is_delete,
            is_active: data.is_active,
            product_unit: data.product_unit == undefined
                ? undefined
                : data.product_unit.map((x) => {
                    return product_unit_model_1.ProductUnitViewModel.fromMap(x);
                }),
            product_stock: data.product_stock == undefined
                ? undefined
                : ProductStockModel.fromMap(data.product_stock),
        });
    }
    static fromMeilisearch(data) {
        return new ProductModel({
            id: data.id,
            reference: data.reference,
            description: data.description,
            product_brand_id: data.product_brand_id,
            product_type_id: data.product_type_id,
            created_by: data.created_by,
            created_at: data.created_at,
            updated_by: data.updated_by,
            updated_at: data.updated_at,
            minimum_stock: data.minimum_stock,
            unit: data.unit,
            product_brand: product_brand_model_1.ProductBrandViewModel.fromMap(data.product_brand),
            product_type: product_type_model_1.ProductTypeViewModel.fromMap(data.product_type),
            product_unit: data.product_unit == undefined
                ? []
                : data.product_unit.map((x) => {
                    return product_unit_model_1.ProductUnitModel.fromMap(x);
                }),
            sales_price: Number(data.sales_price),
            sales_discount: Number(data.sales_discount),
            purchase_price: Number(data.purchase_price),
            purchase_discount: Number(data.purchase_discount),
            is_active: data.is_active,
            is_delete: data.is_delete,
        });
    }
}
exports.ProductModel = ProductModel;
class ItemUnitModel {
}
exports.ItemUnitModel = ItemUnitModel;
class ProductStockModel {
    constructor(data) {
        this.id = data.id;
        this.product_id = data.product_id;
        this.stock = data.stock;
    }
    static fromMap(data) {
        return new ProductStockModel({
            id: data.id,
            product_id: Number(data.product_id),
            stock: Number(data.stock),
        });
    }
}
exports.ProductStockModel = ProductStockModel;
//# sourceMappingURL=product.model.js.map