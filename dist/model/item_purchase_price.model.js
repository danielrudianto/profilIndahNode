"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ItemPurchasePriceModel {
    constructor(price, item_id, created_by, item_unit_id = null) {
        this.item_id = item_id;
        this.price = price;
        this.created_by = created_by;
        this.created_at = new Date();
        this.item_unit_id = item_unit_id;
    }
    create() {
        return prisma.item_price_purchase.create({
            data: {
                price: this.price,
                created_by: this.created_by,
                created_at: this.created_at,
                item_id: this.item_id,
                item_unit_id: this.item_unit_id,
            },
            select: {
                id: true,
                price: true,
                is_delete: true,
                user: {
                    select: {
                        name: true,
                    },
                },
                item: {
                    select: {
                        reference: true,
                        description: true,
                        item_brand: {
                            select: {
                                name: true,
                            },
                        },
                        item_type: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                item_unit: {
                    select: {
                        unit: true,
                        conversion: true,
                    },
                },
            },
        });
    }
    update() {
        return prisma.$transaction([
            prisma.item_price_purchase.updateMany({
                where: {
                    item_id: this.item_id,
                    item_unit_id: this.item_unit_id,
                    is_delete: false,
                },
                data: {
                    is_delete: true,
                    deleted_at: this.created_at,
                    deleted_by: this.created_by,
                },
            }),
            prisma.item_price_purchase.create({
                data: {
                    price: this.price,
                    created_by: this.created_by,
                    created_at: this.created_at,
                    item_id: this.item_id,
                    item_unit_id: this.item_unit_id,
                },
                select: {
                    id: true,
                    price: true,
                    is_delete: true,
                    user: {
                        select: {
                            name: true,
                        },
                    },
                    item: {
                        select: {
                            reference: true,
                            description: true,
                            item_brand: {
                                select: {
                                    name: true,
                                },
                            },
                            item_type: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    item_unit: {
                        select: {
                            unit: true,
                            conversion: true,
                        },
                    },
                },
            }),
        ]);
    }
    static insertItems(item_price) {
        const transactions = [];
        item_price.forEach((x) => {
            const item_id = x.item_id;
            const item_unit_id = (x.item_unit_id = x.item_unit_id);
            const created_by = x.created_by;
            transactions.push(prisma.item_price_purchase.updateMany({
                where: {
                    item_id: item_id,
                    item_unit_id: item_unit_id,
                    is_delete: false,
                },
                data: {
                    deleted_at: new Date(),
                    is_delete: true,
                    deleted_by: created_by,
                },
            }));
        });
        transactions.push(prisma.item_price_purchase.createMany({
            data: item_price,
        }));
        return Promise.all(transactions);
    }
    static fetchByItemId(id) {
        return prisma.item_price_purchase.findMany({
            where: {
                item_id: id,
                is_delete: false,
            },
        });
    }
    static fetchByItemIds(ids) {
        return prisma.item_price_purchase.findMany({
            where: {
                item_id: {
                    in: ids,
                },
                is_delete: false,
            },
        });
    }
    static fetch(keyword, offset, limit) {
        if (keyword == "") {
            return prisma.$transaction([
                prisma.item.findMany({
                    where: {
                        is_delete: false,
                    },
                    select: {
                        id: true,
                        reference: true,
                        description: true,
                        item_brand: {
                            select: {
                                name: true,
                            },
                        },
                        unit: true,
                        item_price_purchase: {
                            select: {
                                id: true,
                                price: true,
                                item_unit_id: true,
                                item_unit: {
                                    select: {
                                        unit: true,
                                        conversion: true,
                                    },
                                },
                            },
                            where: {
                                is_delete: false,
                            },
                            orderBy: {
                                id: "desc",
                            },
                        },
                    },
                    orderBy: {
                        reference: "asc",
                    },
                    skip: offset,
                    take: limit,
                }),
                prisma.item.count({
                    where: {
                        is_delete: false,
                    },
                }),
            ]);
        }
        else {
            return prisma.$transaction([
                prisma.item.findMany({
                    where: {
                        is_delete: false,
                        OR: [
                            {
                                reference: {
                                    contains: keyword,
                                },
                            },
                            {
                                description: {
                                    contains: keyword,
                                },
                            },
                        ],
                    },
                    select: {
                        id: true,
                        reference: true,
                        description: true,
                        item_brand: {
                            select: {
                                name: true,
                            },
                        },
                        unit: true,
                        item_price_purchase: {
                            select: {
                                id: true,
                                price: true,
                                item_unit_id: true,
                                item_unit: {
                                    select: {
                                        unit: true,
                                        conversion: true,
                                    },
                                },
                            },
                            where: {
                                is_delete: false,
                            },
                            orderBy: [
                                {
                                    item_id: "asc",
                                },
                                {
                                    item_unit_id: "asc",
                                },
                            ],
                        },
                    },
                    orderBy: {
                        reference: "asc",
                    },
                    skip: offset,
                    take: limit,
                }),
                prisma.item.count({
                    where: {
                        is_delete: false,
                        OR: [
                            {
                                reference: {
                                    contains: keyword,
                                },
                            },
                            {
                                description: {
                                    contains: keyword,
                                },
                            },
                        ],
                    },
                }),
            ]);
        }
    }
    static fetchByReference(reference) {
        return prisma.item.findFirst({
            where: {
                reference: reference,
                is_delete: false,
            },
            select: {
                id: true,
                description: true,
                reference: true,
                item_brand: {
                    select: {
                        name: true,
                    },
                },
                item_price_purchase: {
                    select: {
                        price: true,
                    },
                    where: {
                        is_delete: false,
                    },
                    orderBy: {
                        id: "desc",
                    },
                    take: 1,
                    skip: 0,
                },
            },
        });
    }
    static deleteItems(item_ids, created_by) {
        return prisma.item_price_purchase.updateMany({
            where: {
                item_id: {
                    in: item_ids,
                },
            },
            data: {
                is_delete: true,
                deleted_by: created_by,
                deleted_at: new Date(),
            },
        });
    }
    static fetchById(id) {
        return prisma.item_price_purchase.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
                price: true,
                item: {
                    select: {
                        id: true,
                        reference: true,
                        description: true,
                        unit: true,
                        item_brand: {
                            select: {
                                name: true,
                            },
                        },
                        item_type: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                item_unit: {
                    select: {
                        unit: true,
                        conversion: true,
                    },
                },
                item_unit_id: true,
            },
        });
    }
    static fetchByIds(ids) {
        return prisma.item_price_purchase.findMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });
    }
    static delete(item_id, item_unit_id, created_by) {
        return prisma.item_price_purchase.updateMany({
            where: {
                item_id: item_id,
                item_unit_id: item_unit_id,
                is_delete: false,
            },
            data: {
                is_delete: true,
                deleted_at: new Date(),
                deleted_by: created_by,
            },
        });
    }
}
exports.default = ItemPurchasePriceModel;
