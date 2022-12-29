import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
class PaymentMethodModel {
    constructor(name, description, created_by, id = null) {
        if (id != null) {
            this.id = id;
        }
        this.name = name;
        this.description = description;
        this.created_by = created_by;
        this.created_at = new Date();
    }
    create() {
        return prisma.payment_method.create({
            data: {
                name: this.name,
                description: this.description,
                created_at: new Date(),
                created_by: this.created_by,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    update() {
        return prisma.payment_method.update({
            where: {
                id: this.id,
            },
            data: {
                name: this.name,
                description: this.description,
                updated_at: this.created_at,
                updated_by: this.created_by,
            },
            include: {
                user_payment_method_updated_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
    static fetch(keyword, offset, limit) {
        if (keyword == "") {
            return prisma.$transaction([
                prisma.payment_method.findMany({
                    where: {
                        is_delete: false,
                    },
                    orderBy: {
                        name: "asc",
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    skip: offset,
                    take: limit,
                }),
                prisma.payment_method.count({
                    where: {
                        is_delete: false,
                    },
                }),
            ]);
        }
        else {
            return prisma.$transaction([
                prisma.payment_method.findMany({
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
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        name: "asc",
                    },
                    skip: offset,
                    take: limit,
                }),
                prisma.payment_method.count({
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
        }
    }
    static fetchAutocomplete(keyword) {
        if (keyword == "") {
            return prisma.payment_method.findMany({
                where: {
                    is_delete: false,
                },
                orderBy: {
                    name: "asc",
                },
                take: 5,
                skip: 0,
            });
        }
        else {
            return prisma.payment_method.findMany({
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
                orderBy: {
                    name: "asc",
                },
                take: 5,
                skip: 0,
            });
        }
    }
    static fetchById(id) {
        return prisma.$transaction([
            prisma.payment_method.findUnique({
                where: {
                    id: id,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    is_delete: true,
                },
            }),
            prisma.bill_code.count({
                where: {
                    is_delete: false,
                    payment_method_id: id,
                },
            }),
        ]);
    }
    static delete(id, created_by) {
        return prisma.payment_method.update({
            where: {
                id: id,
            },
            data: {
                deleted_at: new Date(),
                deleted_by: created_by,
                is_delete: true,
            },
            include: {
                user_payment_method_deleted_byTouser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
    }
}
export default PaymentMethodModel;
