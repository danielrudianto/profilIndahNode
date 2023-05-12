"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftBillModel = void 0;
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
class DraftBillModel {
    constructor(queue_number, customer_id, note, items, created_by) {
        this.queue_number = queue_number;
        this.created_by = created_by;
        this.customer_id = customer_id;
        this.items = items;
        this.note = note;
    }
    create() {
        return prisma.draft_bill_code.create({
            data: {
                queue_number: this.queue_number,
                note: this.note,
                created_at: new Date(),
                created_by: this.created_by,
                customer_id: this.customer_id,
                draft_bill: {
                    createMany: {
                        data: this.items.map((x) => {
                            return {
                                item_id: x.item_id,
                                quantity: x.quantity,
                                price: x.price,
                                discount: 0,
                                item_unit_id: x.item_unit_id,
                            };
                        }),
                    },
                },
            },
        });
    }
    static fetchByQueueNumber(queue_number) {
        return prisma.draft_bill_code.findFirst({
            where: {
                queue_number: queue_number,
                is_delete: false,
            },
            select: {
                id: true,
                queue_number: true,
                note: true,
                created_at: true,
                user_draft_bill_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
                draft_bill: {
                    select: {
                        id: true,
                        item: {
                            select: {
                                id: true,
                                reference: true,
                                description: true,
                                item_brand: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                unit: true,
                                item_price: {
                                    select: {
                                        price: true,
                                        discount: true,
                                    },
                                    where: {
                                        is_delete: false,
                                        item_unit_id: null,
                                    },
                                    take: 1,
                                    skip: 0,
                                    orderBy: {
                                        created_at: "desc",
                                    },
                                },
                            },
                        },
                        item_unit: {
                            select: {
                                unit: true,
                                conversion: true,
                                item_price: {
                                    select: {
                                        price: true,
                                        discount: true,
                                    },
                                    where: {
                                        is_delete: false,
                                    },
                                    take: 1,
                                    skip: 0,
                                    orderBy: {
                                        created_at: "desc",
                                    },
                                },
                            },
                        },
                        price: true,
                        discount: true,
                        quantity: true,
                    },
                },
            },
        });
    }
    static order(id, name, discount, delivery, service, customer_id, payment_method_id, items, date, createdBy) {
        return Promise.all([
            prisma.draft_bill_code.update({
                where: {
                    id: id,
                },
                data: {
                    is_delete: true,
                    confirmed_at: new Date(),
                    confirmed_by: createdBy,
                },
            }),
            prisma.bill_code.create({
                data: {
                    created_by: createdBy,
                    created_at: new Date(),
                    date: date,
                    name: name,
                    uuid: (0, uuid_1.v4)(),
                    discount: discount,
                    delivery: delivery,
                    service: service,
                    customer_id: customer_id,
                    payment_method_id: payment_method_id,
                    bill: {
                        createMany: {
                            data: items.map((x) => {
                                return {
                                    item_id: x.item_id,
                                    quantity: x.quantity,
                                    price: x.price,
                                    discount: x.discount,
                                    item_unit_id: x.item_unit_id,
                                };
                            }),
                        },
                    },
                },
            }),
        ]);
    }
    static fetchByID(id) {
        return prisma.draft_bill_code.findUnique({
            where: {
                id: id,
            },
            include: {
                draft_bill: {
                    select: {
                        id: true,
                        item_id: true,
                        item_unit_id: true,
                    },
                },
            },
        });
    }
    static truncateData() {
        return prisma.$queryRawUnsafe("TRUNCATE TABLE draft_bill_code RESTART IDENTITY");
    }
}
exports.DraftBillModel = DraftBillModel;
