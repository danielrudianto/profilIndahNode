"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModel = void 0;
class CustomerModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.address = data.address;
        this.npwp = data.npwp;
        this.pic = data.pic;
        this.phone_number = data.phone_number;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.updated_by = data.updated_by;
        this.updated_at = data.updated_at;
        this.deleted_by = data.deleted_by;
        this.deleted_at = data.deleted_at;
        this.user = data.user;
        this.is_delete = data.is_delete;
        // if can_delete is boolean, use it directly
        if (typeof data.can_delete === "boolean") {
            this.can_delete = data.can_delete;
        }
        else if (typeof data.can_delete === "string") {
            this.can_delete = data.can_delete === "1";
        }
        if (typeof data.is_delete === "boolean") {
            this.is_delete = data.is_delete;
        }
        else if (typeof data.is_delete === "string") {
            this.is_delete = data.is_delete === "1";
        }
    }
    static fromMap(data) {
        return new CustomerModel({
            id: data.id,
            name: data.name,
            address: data.address,
            npwp: data.npwp,
            pic: data.pic,
            phone_number: data.phone_number,
            created_by: data.created_by,
            created_at: new Date(data.created_at),
            is_delete: data.is_delete,
            can_delete: data.can_delete == undefined ? undefined : data.can_delete,
        });
    }
}
exports.CustomerModel = CustomerModel;
//# sourceMappingURL=customer.model.js.map