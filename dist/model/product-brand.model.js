"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductBrandViewModel = exports.ProductBrandModel = void 0;
const user_model_1 = require("./user.model");
class ProductBrandModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.created_by = data.created_by;
        this.created_at = data.created_at || new Date();
        this.is_delete = data.is_delete || false;
        this.deleted_by = data.deleted_by || null;
        this.deleted_at = data.deleted_at || null;
        this.user = data.user; // user information if available
        // if can_delete is provided
        if (data.can_delete !== undefined) {
            if (typeof data.can_delete === "boolean") {
                this.can_delete = data.can_delete;
            }
            else if (typeof data.can_delete === "string") {
                this.can_delete = data.can_delete.toLowerCase() === "1";
            }
        }
    }
    static fromMap(data) {
        return new ProductBrandModel({
            id: data.id,
            name: data.name,
            created_by: data.created_by,
            created_at: data.created_at,
            is_delete: data.is_delete,
            deleted_by: data.deleted_by,
            deleted_at: data.deleted_at,
            can_delete: data.can_delete,
            user: data.user == undefined ? undefined : user_model_1.UserViewModel.fromMap(data.user),
        });
    }
}
exports.ProductBrandModel = ProductBrandModel;
class ProductBrandViewModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
    }
    static fromMap(data) {
        return new ProductBrandViewModel({
            id: data.id,
            name: data.name,
        });
    }
}
exports.ProductBrandViewModel = ProductBrandViewModel;
//# sourceMappingURL=product-brand.model.js.map