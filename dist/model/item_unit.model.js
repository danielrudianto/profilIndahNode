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
        const inserts = [];
        units.forEach((unit) => {
            inserts.push(prisma.item_unit.create({
                data: {
                    item_id: item_id,
                    created_by: created_by,
                    created_at: created_at,
                    unit: unit.unit,
                    conversion: unit.conversion,
                    item_price: {
                        create: {
                            price: unit.price,
                            discount: unit.discount,
                            created_at: created_at,
                            created_by: created_by,
                            item_id: item_id,
                            effective_date: created_at,
                        },
                    },
                    item_price_purchase: {
                        create: {
                            price: unit.price_purchase,
                            created_by: created_by,
                            created_at: created_at,
                            item_id: item_id,
                        },
                    },
                },
            }));
        });
        return Promise.all(inserts);
    }
    static fetchByItemReference(reference) {
        return prisma.item.findFirst({
            where: {
                reference: reference,
                is_delete: false,
            },
            select: {
                reference: true,
                description: true,
                id: true,
                unit: true,
                item_brand: {
                    select: {
                        name: true,
                    },
                },
                item_unit: {
                    select: {
                        conversion: true,
                        unit: true,
                        id: true,
                    },
                    where: {
                        is_delete: false,
                    },
                },
                is_delete: true,
            },
        });
    }
    static updateMany(units, deleted_by) {
        const transaction = [];
        units.forEach((x) => {
            if (x.is_delete) {
                transaction.push(prisma.item_unit.update({
                    where: {
                        id: x.id,
                    },
                    data: {
                        is_delete: true,
                        deleted_by: deleted_by,
                        deleted_at: new Date(),
                        conversion: parseFloat(x.conversion.toString()),
                        unit: x.unit,
                        item_price_purchase: {
                            updateMany: {
                                data: {
                                    deleted_at: new Date(),
                                    deleted_by: deleted_by,
                                    is_delete: true,
                                },
                                where: {
                                    item_id: x.item_id,
                                    item_unit_id: x.id,
                                    is_delete: false,
                                },
                            },
                        },
                        item_price: {
                            updateMany: {
                                data: {
                                    deleted_at: new Date(),
                                    deleted_by: deleted_by,
                                    is_delete: true,
                                },
                                where: {
                                    item_id: x.item_id,
                                    item_unit_id: x.id,
                                    is_delete: false,
                                },
                            },
                        },
                    },
                }));
            }
            else {
                transaction.push(prisma.item_unit.update({
                    where: {
                        id: x.id,
                    },
                    data: {
                        conversion: parseFloat(x.conversion.toString()),
                        unit: x.unit,
                    },
                }));
            }
        });
        return prisma.$transaction(transaction);
    }
}
exports.default = ItemUnitModel;
