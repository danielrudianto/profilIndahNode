"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PurchaseDocumentModel {
    constructor(name, date, discount, good_receipt_code_id, created_by, id = null) {
        this.is_delete = false;
        this.is_confirm = true;
        if (id != null) {
            this.id = id;
        }
        this.name = name;
        this.date = date;
        this.discount = discount;
        this.good_receipt_code_id = good_receipt_code_id;
        this.created_by = created_by;
        this.created_at = new Date();
        this.confirmed_by = created_by;
        this.confirmed_at = this.created_at;
    }
    create() {
        return prisma.purchase_invoice.create({
            data: {
                name: this.name,
                date: this.date,
                discount: this.discount,
                good_receipt_code_id: this.good_receipt_code_id,
                created_by: this.created_by,
                created_at: this.created_at,
                is_confirm: true,
                confirmed_by: this.confirmed_by,
                confirmed_at: this.confirmed_at,
            },
        });
    }
    update() {
        return prisma.purchase_invoice.update({
            where: {
                id: this.id,
            },
            data: {
                name: this.name,
                date: this.date,
                discount: this.discount,
            },
        });
    }
    delete() {
        return prisma.purchase_invoice.update({
            where: {
                id: this.id,
            },
            data: {},
        });
    }
    static fetchById(id) {
        return prisma.good_receipt_code.findUnique({
            where: {
                id: id,
            },
            select: {
                name: true,
                date: true,
                user_good_receipt_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                created_at: true,
                user_good_receipt_code_confirmed_byTouser: {
                    select: {
                        name: true,
                    },
                },
                confirmed_at: true,
                is_confirm: true,
                is_delete: true,
                company: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        npwp: true,
                    },
                },
                supplier: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        npwp: true,
                    },
                },
                good_receipt: {
                    select: {
                        id: true,
                        item: {
                            select: {
                                id: true,
                                reference: true,
                                description: true,
                            },
                        },
                        quantity: true,
                        price: true,
                    },
                },
                purchase_invoice: {
                    select: {
                        name: true,
                        date: true,
                        discount: true,
                        user_purchase_invoice_created_byTouser: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    }
}
exports.default = PurchaseDocumentModel;
