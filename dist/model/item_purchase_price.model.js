"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ItemPurchasePriceModel {
    constructor(price, item_id, created_by) {
        this.item_id = item_id;
        this.price = price;
        this.created_by = created_by;
        this.created_at = new Date();
    }
    create() {
        return prisma.item_price_purchase.create({
            data: {
                price: this.price,
                created_by: this.created_by,
                created_at: this.created_at,
                item_id: this.item_id,
            },
            select: {
                price: true,
                is_delete: true,
                user: {
                    select: {
                        name: true,
                    },
                },
            },
        });
    }
    static insertItems(item_price) {
        const transactions = [];
        item_price.forEach((x) => {
            const item_id = x.item_id;
            transactions.push(prisma.item_price_purchase.updateMany({
                where: {
                    item_id: item_id,
                },
                data: {
                    deleted_at: new Date(),
                    is_delete: true,
                },
            }));
        });
        transactions.push(prisma.item_price_purchase.createMany({
            data: item_price,
        }));
        return transactions;
    }
    static fetchByItemId(id) {
        return prisma.item_price_purchase.findFirst({
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
                    in: ids
                },
                is_delete: false
            }
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
    static fetchAll() {
        return prisma.item.findMany({
            where: {
                is_delete: false,
            },
            select: {
                reference: true,
                description: true,
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
                    take: 1,
                    skip: 0,
                },
            },
            orderBy: {
                reference: "asc",
            },
        });
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
            },
        });
    }
}
exports.default = ItemPurchasePriceModel;
