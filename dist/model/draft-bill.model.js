"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DraftBillModel = void 0;
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
class DraftBillModel {
    constructor(customer_id, note, items, created_by) {
        this.created_by = created_by;
        this.customer_id = customer_id;
        this.items = items;
        this.note = note;
    }
    create() {
        return prisma.draft_bill_code.create({
            data: {
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
