"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AdjustmentCaseModel {
    constructor(item_id, item_unit_id, quantity, adjustment_case_code_id, id = null) {
        this.item_id = item_id;
        this.item_unit_id = item_unit_id;
        this.quantity = quantity;
        this.adjustment_case_code_id = adjustment_case_code_id;
        if (this.id != null) {
            this.id = id;
        }
    }
    static createMany(items) {
        return prisma.adjustment_case.createMany({
            data: items.map((x) => {
                return Object.assign(Object.assign({}, x), { id: undefined });
            }),
        });
    }
    static fetchById(id) {
        return prisma.adjustment_case.findUnique({
            where: {
                id: id,
            },
            select: {
                adjustment_case_code: {
                    select: {
                        name: true,
                        id: true,
                        is_confirm: true,
                        is_delete: true,
                        user_adjustment_case_code_created_byTouser: {
                            select: {
                                name: true,
                            },
                        },
                        created_at: true,
                        adjustment_case: {
                            select: {
                                id: true,
                                item: {
                                    select: {
                                        reference: true,
                                        description: true,
                                    },
                                },
                                quantity: true,
                            },
                        },
                    },
                },
            },
        });
    }
}
exports.default = AdjustmentCaseModel;
