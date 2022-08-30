"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ItemUnitModel {
    constructor(item_id, unit, conversion, created_by, id = null) {
        this.id = id;
        this.item_id = item_id;
        this.unit = unit;
        this.conversion = conversion;
        this.created_by = created_by;
        this.created_at = new Date();
        this.is_delete = false;
        this.deleted_by = null;
        this.deleted_at = null;
    }
    static createMany(units, item_id, created_by, created_at = new Date()) {
        return prisma.item_unit.createMany({
            data: units.map(x => {
                return Object.assign(Object.assign({}, x), { item_id: item_id, created_by: created_by, created_at: created_at });
            })
        });
    }
    static fetchByItemReference(reference) {
        return prisma.item.findFirst({
            where: {
                reference: reference,
                is_delete: false
            },
            select: {
                reference: true,
                description: true,
                id: true,
                unit: true,
                item_brand: {
                    select: {
                        name: true
                    }
                },
                item_unit: {
                    select: {
                        conversion: true,
                        unit: true,
                        id: true
                    },
                    where: {
                        is_delete: false
                    }
                },
                is_delete: true
            }
        });
    }
    static updateMany(units) {
        const transaction = [];
        units.forEach(x => {
            transaction.push(prisma.item_unit.update({
                where: {
                    id: x.id
                },
                data: {
                    is_delete: x.is_delete,
                    conversion: parseFloat(x.conversion.toString()),
                    unit: x.unit
                }
            }));
        });
        return prisma.$transaction(transaction);
    }
}
exports.default = ItemUnitModel;
