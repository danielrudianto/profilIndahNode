"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserRoleModel {
    constructor(user_id, role) {
        this.user_id = user_id;
        this.role = role;
    }
    create() {
        return prisma.user_department.create({
            data: {
                user_id: this.user_id,
                role: this.role,
            },
        });
    }
    update() {
        return prisma.user_department.update({
            where: {
                user_id: this.user_id,
            },
            data: {
                role: this.role,
            },
        });
    }
}
exports.default = UserRoleModel;
