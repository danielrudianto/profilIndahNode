"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ItemTypeModel {
    constructor(name, created_by, id = null) {
        this.id = id;
        this.name = name;
        this.created_by = created_by;
    }
    create() {
        return prisma.item_type.create({
            data: {
                name: this.name,
                created_by: this.created_by,
            },
            select: {
                id: true,
                name: true,
                created_by: true,
                created_at: true,
                user_item_type_created_byTouser: {
                    select: {
                        name: true,
                        id: true,
                    }
                }
            }
        });
    }
    update() {
        return prisma.item_type.update({
            where: {
                id: this.id
            },
            data: {
                name: this.name,
                updated_at: new Date(),
                updated_by: this.created_by
            }
        });
    }
    static fetchItemById(id) {
        return prisma.$transaction([
            prisma.item_type.findUnique({
                where: {
                    id: id
                }
            }),
            prisma.item.count({
                where: {
                    item_type_id: id,
                    is_delete: false
                }
            })
        ]);
    }
    static fetchItems(keyword, offset, limit) {
        if (keyword == "") {
            return prisma.$transaction([
                prisma.item_type.findMany({
                    where: {
                        is_delete: false,
                    },
                    orderBy: {
                        name: "asc",
                    },
                    select: {
                        id: true,
                        name: true,
                        created_at: true,
                        created_by: true,
                        user_item_type_created_byTouser: {
                            select: {
                                name: true,
                            },
                        },
                    },
                    take: limit,
                    skip: offset,
                }),
                prisma.item_type.count({
                    where: {
                        is_delete: false,
                    },
                }),
            ]);
        }
        else {
            return prisma.$transaction([
                prisma.item_type.findMany({
                    where: {
                        is_delete: false,
                        name: {
                            contains: keyword,
                        },
                    },
                    orderBy: {
                        name: "asc",
                    },
                    select: {
                        id: true,
                        name: true,
                        created_at: true,
                        user_item_type_created_byTouser: {
                            select: {
                                name: true,
                                id: true,
                            },
                        },
                    },
                    take: limit,
                    skip: offset,
                }),
                prisma.item_type.count({
                    where: {
                        is_delete: false,
                        name: {
                            contains: keyword,
                        },
                    },
                }),
            ]);
        }
    }
    static fetchAutocomplete(keyword) {
        if (keyword == "") {
            return prisma.item_type.findMany({
                where: {
                    is_delete: false
                },
                orderBy: {
                    name: "asc"
                },
                take: 5,
                skip: 0
            });
        }
        else {
            return prisma.item_type.findMany({
                where: {
                    is_delete: false,
                    name: {
                        contains: keyword
                    }
                },
                orderBy: {
                    name: "asc"
                },
                take: 5,
                skip: 0
            });
        }
    }
    static fetchByBrandIds(ids) {
        return prisma.item_type.findMany({
            where: {
                item: {
                    some: {
                        item_brand_id: {
                            in: ids
                        },
                        is_active: true,
                        is_delete: false,
                    }
                }
            },
            select: {
                id: true,
                name: true,
            }
        });
    }
}
exports.default = ItemTypeModel;
