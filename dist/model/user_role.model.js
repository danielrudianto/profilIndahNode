"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoleModel = void 0;
class UserRoleModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
    }
    // from roleID to role name
    static fromRoleID(roleID) {
        const role = this.roles.find((r) => r.id === roleID);
        return role ? role.name : null;
    }
    // check if role is available
    static isAvailable(roleID) {
        const role = this.roles.find((r) => r.id === roleID);
        return role ? role.available : false;
    }
}
exports.UserRoleModel = UserRoleModel;
// list of available roles
UserRoleModel.roles = [
    { id: 1, name: "Pembelian", available: true },
    { id: 2, name: "Penjualan", available: true },
    { id: 3, name: "Penjualan & Pembelian", available: true },
    { id: 5, name: "Administrator", available: true },
    { id: 6, name: "Gudang", available: false },
    { id: 7, name: "Superadministrator", available: false },
];
//# sourceMappingURL=user_role.model.js.map