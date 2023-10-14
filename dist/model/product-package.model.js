"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPackageCodeModel = exports.ProductPackageModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ProductPackageModel {
    constructor(item_id, item_unit_id, quantity, price, discount, id) {
        this.id = id;
        this.item_id = item_id;
        this.item_unit_id = item_unit_id;
        this.quantity = quantity;
        this.price = price;
        this.discount = discount;
    }
}
exports.ProductPackageModel = ProductPackageModel;
class ProductPackageCodeModel {
    constructor(name, description, price, items, created_by, created_at, is_delete, deleted_by, deleted_at, id) {
        if (id != null)
            this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.items = items;
        if (created_by != null)
            this.created_by = created_by;
        if (created_at != null)
            this.created_at = created_at;
        if (is_delete != null)
            this.is_delete = is_delete;
        if (deleted_by != null)
            this.deleted_by = deleted_by;
        if (deleted_at != null)
            this.deleted_at = deleted_at;
    }
    create() {
        return prisma.package_code.create({
            data: {
                name: this.name,
                description: this.description,
                price: this.price,
                created_by: this.created_by,
                is_delete: this.is_delete,
                created_at: new Date(),
                package_content: {
                    createMany: {
                        data: this.items.map((x) => {
                            return {
                                item_id: x.item_id,
                                item_unit_id: x.item_unit_id,
                                quantity: x.quantity,
                                price: x.price,
                                discount: x.discount,
                            };
                        }),
                    },
                },
            },
            include: {
                package_content: {
                    include: {
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
                            },
                        },
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                },
            },
        });
    }
}
exports.ProductPackageCodeModel = ProductPackageCodeModel;
ProductPackageCodeModel.fetch = (page = 1, keyword = "") => {
    return prisma.$transaction([
        prisma.package_code.findMany({
            where: {
                is_delete: false,
                OR: [
                    {
                        name: {
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
            include: {
                package_content: {
                    include: {
                        item: {
                            select: {
                                reference: true,
                                description: true,
                                unit: true,
                            },
                        },
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                            },
                        },
                    },
                },
            },
            skip: (page - 1) * 10,
            take: 10,
            orderBy: {
                name: "asc",
            },
        }),
        prisma.package_code.count({
            where: {
                is_delete: false,
                OR: [
                    {
                        name: {
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
};
ProductPackageCodeModel.fetchAll = () => {
    return prisma.package_code.findMany({
        where: {
            is_delete: false,
        },
        include: {
            package_content: {
                include: {
                    item: {
                        select: {
                            reference: true,
                            description: true,
                            unit: true,
                        },
                    },
                    item_unit: {
                        select: {
                            unit: true,
                            conversion: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            name: "asc",
        },
    });
};
ProductPackageCodeModel.fetchByID = (id) => {
    return prisma.package_code.findUnique({
        where: {
            id: id,
        },
        include: {
            package_content: {
                include: {
                    item: {
                        select: {
                            reference: true,
                            description: true,
                            unit: true,
                        },
                    },
                    item_unit: {
                        select: {
                            unit: true,
                            conversion: true,
                        },
                    },
                },
            },
        },
    });
};
ProductPackageCodeModel.update = (name, description, price, id) => {
    return prisma.package_code.update({
        where: {
            id: id,
        },
        data: {
            name: name,
            description: description,
            price: price,
        },
        include: {
            package_content: {
                include: {
                    item: {
                        select: {
                            reference: true,
                            description: true,
                            unit: true,
                        },
                    },
                    item_unit: {
                        select: {
                            unit: true,
                            conversion: true,
                        },
                    },
                },
            },
        },
    });
};
ProductPackageCodeModel.delete = (id, deletedBy) => {
    return prisma.package_code.update({
        where: {
            id: id,
        },
        data: {
            is_delete: true,
            deleted_at: new Date(),
            deleted_by: deletedBy,
        },
    });
};
ProductPackageCodeModel.updatePrice = (data) => {
    const transactions = data.map((x) => {
        return prisma.package_code.update({
            where: {
                id: x.id,
            },
            data: {
                price: x.price,
            },
        });
    });
    return prisma.$transaction(transactions);
};
