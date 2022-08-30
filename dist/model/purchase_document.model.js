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
            include: {
                good_receipt_code: {
                    select: {
                        company_id: true,
                        supplier_id: true,
                    },
                },
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
    static fetchPurchaseByQuarter(quarter, year) {
        switch (quarter) {
            case 1:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(good_receipt.quantity * good_receipt.quantity * COALESCE(item_unit.conversion, 1)) AS value, SUM(discount) AS discount
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          LEFT JOIN item_unit ON good_receipt.item_unit_id =  item_unit.id
          WHERE good_receipt_code.is_confirm = 1
          AND purchase_invoice.is_confirm = 1
          AND good_receipt_code.is_delete = 0
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.date <= '${year}-03-31';
          AND purchase_invoice.date >= '${year}-01-01';
        `);
            case 2:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(good_receipt.quantity * good_receipt.quantity * COALESCE(item_unit.conversion, 1)) AS value, SUM(discount) AS discount
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          LEFT JOIN item_unit ON good_receipt.item_unit_id =  item_unit.id
          WHERE good_receipt_code.is_confirm = 1
          AND purchase_invoice.is_confirm = 1
          AND good_receipt_code.is_delete = 0
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.date <= '${year}-06-30'
          AND purchase_invoice.date >= '${year}-04-01';
        `);
            case 3:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(good_receipt.quantity * good_receipt.quantity * COALESCE(item_unit.conversion, 1)) AS value, SUM(discount) AS discount
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          LEFT JOIN item_unit ON good_receipt.item_unit_id =  item_unit.id
          WHERE good_receipt_code.is_confirm = 1
          AND purchase_invoice.is_confirm = 1
          AND good_receipt_code.is_delete = 0
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.date <= '${year}-09-30'
          AND purchase_invoice.date >= '${year}-07-01';
        `);
            case 4:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(good_receipt.quantity * good_receipt.quantity * COALESCE(item_unit.conversion, 1)) AS value, SUM(discount) AS discount
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          LEFT JOIN item_unit ON good_receipt.item_unit_id =  item_unit.id
          WHERE good_receipt_code.is_confirm = 1
          AND purchase_invoice.is_confirm = 1
          AND good_receipt_code.is_delete = 0
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.date <= '${year}-12-31'
          AND purchase_invoice.date >= '${year}-10-01';
        `);
            default:
                const promise = new Promise((resolve, reject) => {
                    resolve(null);
                });
        }
    }
    static fetchSum(month, year) {
        if (month == 0) {
            return prisma.$queryRawUnsafe(`
        SELECT SUM(goodReceipt.value) AS value, SUM(discount) AS discount, company.id as company_id, company.name
        FROM purchase_invoice
        JOIN (
          SELECT SUM(good_receipt.quantity * good_receipt.price * COALESCE(item_unit.conversion, 1)) AS value, good_receipt_code_id, good_receipt_code.company_id
          FROM good_receipt
          LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          GROUP BY good_receipt.good_receipt_code_id
        ) goodReceipt
        ON purchase_invoice.good_receipt_code_id = goodReceipt.good_receipt_code_id
        JOIN company ON goodReceipt.company_id = company.id
        AND YEAR(purchase_invoice.date) = ${year}
        AND purchase_invoice.is_confirm = 1
        AND purchase_invoice.is_delete = 0
        GROUP BY company.id
      `);
        }
        else {
            return prisma.$queryRawUnsafe(`
        SELECT SUM(goodReceipt.value) AS value, SUM(discount) AS discount, company.id as company_id, company.name
        FROM purchase_invoice
        JOIN (
          SELECT SUM(good_receipt.quantity * good_receipt.price * COALESCE(item_unit.conversion, 1)) AS value, good_receipt_code_id, good_receipt_code.company_id
          FROM good_receipt
          LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          GROUP BY good_receipt.good_receipt_code_id
        ) goodReceipt
        ON purchase_invoice.good_receipt_code_id = goodReceipt.good_receipt_code_id
        JOIN company ON goodReceipt.company_id = company.id
        WHERE MONTH(purchase_invoice.date) = ${month}
        AND YEAR(purchase_invoice.date) = ${year}
        AND purchase_invoice.is_confirm = 1
        AND purchase_invoice.is_delete = 0
        GROUP BY company.id
      `);
        }
    }
}
exports.default = PurchaseDocumentModel;
