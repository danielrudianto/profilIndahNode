"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const user_model_1 = require("./user.model");
const prisma = new client_1.PrismaClient();
class SupplierModel {
    constructor(data) {
        this.can_delete = false;
        this.id = data.id;
        this.name = data.name;
        this.address = data.address;
        this.npwp = data.npwp;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.is_delete = data.is_delete;
        this.deleted_by = data.deleted_by;
        this.deleted_at = data.deleted_at;
        this.can_delete = data.can_delete;
        this.updated_by = data.updated_by;
        this.updated_at = data.updated_at;
    }
    static fromMap(data) {
        return new SupplierModel({
            id: data.id,
            name: data.name,
            address: data.address,
            npwp: data.npwp,
            created_by: data.created_by,
            created_at: data.created_at,
            is_delete: data.is_delete,
            deleted_by: data.deleted_by,
            deleted_at: data.deleted_at,
            can_delete: data.can_delete == "1",
            updated_by: data.updated_by,
            updated_at: data.updated_at,
            user: data.user ? user_model_1.UserViewModel.fromMap(data.user) : undefined,
        });
    }
}
exports.default = SupplierModel;
//# sourceMappingURL=supplier.model.js.map