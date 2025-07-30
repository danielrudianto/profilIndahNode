"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodViewModel = exports.PaymentMethodModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PaymentMethodModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.is_delete = data.is_delete;
        this.deleted_by = data.deleted_by;
        this.deleted_at = data.deleted_at;
        this.can_delete = data.can_delete;
    }
    static fromMap(data) {
        var _a;
        return new PaymentMethodModel({
            id: data.id,
            name: data.name,
            description: data.description,
            created_by: data.created_by,
            created_at: new Date(data.created_at),
            is_delete: data.is_delete,
            deleted_by: data.deleted_by,
            deleted_at: new Date(data.deleted_at),
            can_delete: (_a = data.can_delete) !== null && _a !== void 0 ? _a : false,
        });
    }
}
exports.PaymentMethodModel = PaymentMethodModel;
class PaymentMethodViewModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
    }
    static fromMap(data) {
        if (data == undefined) {
            return new PaymentMethodViewModel({
                id: null,
                name: "Cash",
                description: "Cash",
            });
        }
        else {
            return new PaymentMethodViewModel({
                id: data.id,
                name: data.name,
                description: data.description,
            });
        }
    }
}
exports.PaymentMethodViewModel = PaymentMethodViewModel;
//# sourceMappingURL=payment-method.model.js.map