"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductTypeViewModel = exports.ProductTypeModel = void 0;
const user_model_1 = require("./user.model");
class ProductTypeModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.updated_by = data.updated_by;
        this.is_delete = data.is_delete;
        this.deleted_at = data.deleted_at;
        this.deleted_by = data.deleted_by;
        this.can_delete = data.can_delete;
        if (data.user_item_type_created_byTouser) {
            this.user_item_type_created_byTouser = user_model_1.UserViewModel.fromMap(data.user_item_type_created_byTouser);
        }
        // if can_delete is provided
        if (data.can_delete !== undefined) {
            if (typeof data.can_delete === "boolean") {
                this.can_delete = data.can_delete;
            }
            else if (typeof data.can_delete === "string") {
                this.can_delete = data.can_delete === "1";
            }
        }
    }
    static fromMap(data) {
        return new ProductTypeModel({
            id: data.id,
            name: data.name,
            created_by: data.created_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
            updated_by: data.updated_by,
            is_delete: data.is_delete,
            deleted_at: data.deleted_at,
            deleted_by: data.deleted_by,
            can_delete: data.can_delete,
            user_item_type_created_byTouser: data.user_item_type_created_byTouser
                ? user_model_1.UserViewModel.fromMap(data.user_item_type_created_byTouser)
                : undefined,
        });
    }
}
exports.ProductTypeModel = ProductTypeModel;
class ProductTypeViewModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
    }
    static fromMap(data) {
        return new ProductTypeViewModel({
            id: data.id,
            name: data.name,
        });
    }
}
exports.ProductTypeViewModel = ProductTypeViewModel;
//# sourceMappingURL=product-type.model.js.map