"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const product_brand_model_1 = require("./product-brand.model");
const supplier_model_1 = __importDefault(require("./supplier.model"));
const user_model_1 = require("./user.model");
class PromotionModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.startDate = data.startDate;
        this.endDate = data.endDate;
        this.target = data.target;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.promotion_rules =
            data.promotion_rules == undefined
                ? undefined
                : data.promotion_rules.map((rule) => ({
                    id: rule.id,
                    rule: rule.rule,
                    value: rule.value,
                }));
        this.promotion_brand =
            data.promotion_brand == undefined
                ? undefined
                : data.promotion_brand.map((brand) => {
                    return {
                        id: brand.id,
                        product_brand_id: brand.product_brand_id,
                        product_brand: brand.product_brand
                            ? product_brand_model_1.ProductBrandModel.fromMap(brand.product_brand)
                            : undefined,
                        promotion_code_id: brand.promotion_code_id,
                    };
                });
        this.supplier_id = data.supplier_id;
        this.supplier = data.supplier;
        this.is_delete = data.is_delete;
        this.deleted_by = data.deleted_by;
        this.deleted_at = data.deleted_at;
        this.promotion_code_created_by = data.promotion_code_created_by;
        this.promotion_code_updated_by = data.promotion_code_updated_by;
        this.promotion_code_deleted_by = data.promotion_code_deleted_by;
    }
    static fromMap(data) {
        return new PromotionModel({
            id: data.id,
            name: data.name,
            description: data.description,
            startDate: new Date(data.start),
            endDate: data.end == null ? null : new Date(data.end),
            target: Number(data.target),
            created_by: data.created_by,
            created_at: data.created_at,
            promotion_rules: data.promotion_rules != undefined
                ? data.promotion_rules.map((rule) => ({
                    id: rule.id,
                    rule: rule.rule,
                    value: rule.value,
                }))
                : undefined,
            promotion_brand: data.promotion_brand != undefined
                ? data.promotion_brand.map((brand) => ({
                    id: brand.id,
                    product_brand_id: brand.product_brand_id,
                    product_brand: brand.product_brand
                        ? product_brand_model_1.ProductBrandModel.fromMap(brand.product_brand)
                        : undefined,
                    promotion_code_id: brand.promotion_code_id,
                }))
                : undefined,
            supplier_id: data.supplier_id,
            supplier: data.supplier
                ? supplier_model_1.default.fromMap(data.supplier)
                : undefined,
            is_delete: data.is_delete,
            deleted_by: data.deleted_by,
            deleted_at: data.deleted_at ? new Date(data.deleted_at) : null,
            promotion_code_created_by: data.promotion_code_created_by
                ? user_model_1.UserViewModel.fromMap(data.promotion_code_created_by)
                : undefined,
            promotion_code_updated_by: data.promotion_code_updated_by
                ? user_model_1.UserViewModel.fromMap(data.promotion_code_updated_by)
                : null,
            promotion_code_deleted_by: data.promotion_code_deleted_by
                ? user_model_1.UserViewModel.fromMap(data.promotion_code_deleted_by)
                : null,
        });
    }
}
exports.default = PromotionModel;
//# sourceMappingURL=promotion.model.js.map