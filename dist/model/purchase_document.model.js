"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PurchaseDocumentModel {
    constructor(name, faktur, date, discount, good_receipt_code_id, created_by, confirmed_by = null, id = null) {
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
        if (confirmed_by == null) {
            this.confirmed_by = null;
            this.confirmed_at = null;
        }
        else {
            this.confirmed_by = confirmed_by;
            this.confirmed_at = new Date();
        }
        this.faktur = faktur;
    }
    create() {
        return prisma.purchase_invoice.create({
            data: {
                name: this.name,
                faktur: this.faktur,
                date: this.date,
                discount: this.discount,
                good_receipt_code_id: this.good_receipt_code_id,
                created_by: this.created_by,
                created_at: this.created_at,
                is_confirm: this.confirmed_by == null ? false : true,
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
                faktur: this.faktur,
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
                        id: true,
                        name: true,
                    },
                },
                created_at: true,
                user_good_receipt_code_confirmed_byTouser: {
                    select: {
                        id: true,
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
                                unit: true,
                            },
                        },
                        item_unit_id: true,
                        item_unit: {
                            select: {
                                id: true,
                                unit: true,
                                conversion: true,
                            },
                        },
                        quantity: true,
                        price: true,
                    },
                },
                purchase_invoice: {
                    select: {
                        is_confirm: true,
                        is_delete: true,
                        name: true,
                        date: true,
                        faktur: true,
                        discount: true,
                        user_purchase_invoice_created_byTouser: {
                            select: {
                                name: true,
                            },
                        },
                        created_at: true,
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
    static fetchUnconfirmed(offset, limit) {
        return prisma.$transaction([
            prisma.purchase_invoice.findMany({
                where: {
                    AND: [
                        {
                            is_confirm: false,
                        },
                        {
                            is_delete: false,
                        },
                    ],
                },
                select: {
                    id: true,
                    date: true,
                    name: true,
                    faktur: true,
                    created_at: true,
                    user_purchase_invoice_created_byTouser: {
                        select: {
                            name: true,
                        },
                    },
                    good_receipt_code: {
                        select: {
                            name: true,
                            date: true,
                            supplier: {
                                select: {
                                    name: true,
                                    address: true,
                                },
                            },
                        },
                    },
                },
                take: limit,
                skip: offset,
            }),
            prisma.purchase_invoice.count({
                where: {
                    is_confirm: false,
                    is_delete: false,
                },
            }),
        ]);
    }
    static confirmById(id, discount, good_receipt, confirmed_by) {
        const transactions = [];
        good_receipt.forEach((x) => {
            transactions.push(prisma.good_receipt.update({
                where: {
                    id: x.id,
                },
                data: {
                    price: x.price,
                },
            }));
        });
        return prisma.$transaction([
            prisma.purchase_invoice.update({
                where: {
                    id: id,
                },
                data: {
                    discount: discount,
                    is_confirm: true,
                    is_delete: false,
                    confirmed_at: new Date(),
                    confirmed_by: confirmed_by,
                },
            }),
            ...transactions,
        ]);
    }
    static deleteById(id, confirmed_by) {
        return prisma.$transaction([
            prisma.purchase_invoice.update({
                where: {
                    id: id,
                },
                data: {
                    is_confirm: false,
                    is_delete: true,
                    confirmed_at: new Date(),
                    confirmed_by: confirmed_by,
                },
            }),
            prisma.good_receipt_code.updateMany({
                where: {
                    purchase_invoice: {
                        id: id,
                    },
                },
                data: {
                    is_confirm: false,
                    is_delete: true,
                    confirmed_at: new Date(),
                    confirmed_by: confirmed_by,
                },
            }),
        ]);
    }
    static fetchReport(start, end, type) {
        if (type == 0) {
            return prisma.$queryRawUnsafe(`
        SELECT item_brand.id, item_brand.name, a.value
        FROM item_brand
        JOIN (
          SELECT SUM(good_receipt.quantity * good_receipt.price) AS value, good_receipt_code.id, item.item_brand_id
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          JOIN item ON good_receipt.item_id = item.id
          WHERE purchase_invoice.is_delete = 0
          AND purchase_invoice.date >= '${start.getFullYear()}-${(start.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${start.getDate().toString().padStart(2, "0")}'
        AND purchase_invoice.date <= '${end.getFullYear()}-${(end.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")}'
          GROUP BY item.item_brand_id
        ) AS a
        ON item_brand.id = a.item_brand_id
      `);
        }
        else if (type == 1) {
            return prisma.$queryRawUnsafe(`
        SELECT item_type.id, item_type.name, a.value
        FROM item_type
        JOIN (
          SELECT SUM(good_receipt.quantity * good_receipt.price) AS value, good_receipt_code.id, item.item_type_id
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          JOIN item ON good_receipt.item_id = item.id
          WHERE purchase_invoice.is_delete = 0
          AND purchase_invoice.date >= '${start.getFullYear()}-${(start.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${start.getDate().toString().padStart(2, "0")}'
        AND purchase_invoice.date <= '${end.getFullYear()}-${(end.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")}'
          GROUP BY item.item_type_id
        ) AS a
        ON item_type.id = a.item_type_id
      `);
        }
        else {
            return prisma.$queryRawUnsafe(`
        SELECT supplier.id, supplier.name, SUM(a.value - purchase_invoice.discount) AS value
        FROM purchase_invoice
        JOIN (
          SELECT SUM(good_receipt.quantity * good_receipt.price) AS value, good_receipt_code.id, good_receipt_code.supplier_id
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          GROUP BY good_receipt_code.id
        ) AS a
        ON purchase_invoice.good_receipt_code_id = a.id
        JOIN supplier ON a.supplier_id = supplier.id
        WHERE purchase_invoice.is_delete = 0
        AND purchase_invoice.date >= '${start.getFullYear()}-${(start.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${start.getDate().toString().padStart(2, "0")}'
        AND purchase_invoice.date <= '${end.getFullYear()}-${(end.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")}'
        GROUP BY supplier.id
      `);
        }
    }
    static fetchReportById(start, end, type, id) {
        if (type == 0) {
            return prisma.$queryRawUnsafe(`
      SELECT item.reference, item.description, good_receipt.quantity, good_receipt.price, good_receipt_code.name AS good_receipt_name, purchase_invoice.name AS purchase_invoice_name, supplier.name AS supplier_name, item_type.name AS item_type_name, item_brand.name AS item_brand_name, company.name AS company_name
      FROM good_receipt
      JOIN item ON good_receipt.item_id = item.id
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
      JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
      JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
      JOIN supplier ON good_receipt_code.supplier_id = supplier.id
      JOIN company ON good_receipt_code.company_id = company.id
      WHERE purchase_invoice.is_delete = 0
        AND purchase_invoice.date >= '${start.getFullYear()}-${(start.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${start.getDate().toString().padStart(2, "0")}'
      AND purchase_invoice.date <= '${end.getFullYear()}-${(end.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")}'
        AND item.item_brand_id = ${id}
    `);
        }
        else if (type == 1) {
            return prisma.$queryRawUnsafe(`
      SELECT item.reference, item.description, good_receipt.quantity, good_receipt.price, good_receipt_code.name AS good_receipt_name, purchase_invoice.name AS purchase_invoice_name, supplier.name AS supplier_name, item_type.name AS item_type_name, item_brand.name AS item_brand_name, company.name AS company_name
      FROM good_receipt
      JOIN item ON good_receipt.item_id = item.id
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
      JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
      JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
      JOIN supplier ON good_receipt_code.supplier_id = supplier.id
      JOIN company ON good_receipt_code.company_id = company.id
      WHERE purchase_invoice.is_delete = 0
        AND purchase_invoice.date >= '${start.getFullYear()}-${(start.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${start.getDate().toString().padStart(2, "0")}'
      AND purchase_invoice.date <= '${end.getFullYear()}-${(end.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")}'
        AND item.item_type_id = ${id}
    `);
        }
        else {
            return prisma.$queryRawUnsafe(`
      SELECT item.reference, item.description, good_receipt.quantity, good_receipt.price, good_receipt_code.name AS good_receipt_name, purchase_invoice.name AS purchase_invoice_name, supplier.name AS supplier_name, item_type.name AS item_type_name, item_brand.name AS item_brand_name, company.name AS company_name
      FROM good_receipt
      JOIN item ON good_receipt.item_id = item.id
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
      JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
      JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
      JOIN supplier ON good_receipt_code.supplier_id = supplier.id
      JOIN company ON good_receipt_code.company_id = company.id
      WHERE purchase_invoice.is_delete = 0
        AND purchase_invoice.date >= '${start.getFullYear()}-${(start.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${start.getDate().toString().padStart(2, "0")}'
      AND purchase_invoice.date <= '${end.getFullYear()}-${(end.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${end.getDate().toString().padStart(2, "0")}'
        AND good_receipt_code.supplier_id = ${id}
    `);
        }
    }
    static confirmByIdUnchanged(id, user_id) {
        return prisma.purchase_invoice.update({
            where: {
                id: id,
            },
            data: {
                is_confirm: true,
                is_delete: false,
                confirmed_at: new Date(),
                confirmed_by: user_id,
            },
        });
    }
    static fetchAppendix(month, year) {
        if (month == 0) {
            return prisma.$queryRawUnsafe(`
        SELECT purchase_invoice.name AS purchase_invoice_name, purchase_invoice.date, (goodReceipt.value - purchase_invoice.discount) AS value, supplier.name AS supplier_name, company.name AS company_name
        FROM purchase_invoice
        JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
        JOIN (
          SELECT SUM(good_receipt.quantity * good_receipt.price) AS value, good_receipt.good_receipt_code_id
          FROM good_receipt
          GROUP BY good_receipt.good_receipt_code_id
        ) goodReceipt
        ON good_receipt_code.id = goodReceipt.good_receipt_code_id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        JOIN company ON good_receipt_code.company_id = company.id
        WHERE good_receipt_code.is_confirm = 1
        AND good_receipt_code.is_delete = 0
        AND purchase_invoice.is_confirm = 1
        AND purchase_invoice.is_delete = 0
        AND YEAR(purchase_invoice.date) = ${year}
      `);
        }
        else {
            return prisma.$queryRawUnsafe(`
        SELECT purchase_invoice.name AS purchase_invoice_name, purchase_invoice.date, (goodReceipt.value - purchase_invoice.discount) AS value, supplier.name AS supplier_name, company.name AS company_name
        FROM purchase_invoice
        JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
        JOIN (
          SELECT SUM(good_receipt.quantity * good_receipt.price) AS value, good_receipt.good_receipt_code_id
          FROM good_receipt
          GROUP BY good_receipt.good_receipt_code_id
        ) goodReceipt
        ON good_receipt_code.id = goodReceipt.good_receipt_code_id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        JOIN company ON good_receipt_code.company_id = company.id
        WHERE good_receipt_code.is_confirm = 1
        AND good_receipt_code.is_delete = 0
        AND purchase_invoice.is_confirm = 1
        AND purchase_invoice.is_delete = 0
        AND YEAR(purchase_invoice.date) = ${year}
        AND MONTH(purchase_invoice.date) = ${month}
      `);
        }
    }
}
exports.default = PurchaseDocumentModel;
