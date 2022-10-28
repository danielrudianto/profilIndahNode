"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SalesReturnModel {
    constructor(name, date, created_by, payment_method_id, sales_return = [], id, is_confirm = true) {
        this.is_confirm = false;
        this.is_delete = false;
        if (id != null) {
            this.id = id;
        }
        this.name = name;
        this.date = date;
        this.created_by = created_by;
        this.created_at = new Date();
        this.payment_method_id = payment_method_id;
        this.confirmed = is_confirm;
        this.sales_return = sales_return;
    }
    create() {
        return prisma.sales_return_code.create({
            data: {
                name: this.name,
                date: this.date,
                created_by: this.created_by,
                created_at: this.created_at,
                is_confirm: this.confirmed ? true : false,
                confirmed_by: this.confirmed ? this.created_by : null,
                confirmed_at: this.confirmed ? new Date() : null,
                payment_method_id: this.payment_method_id,
                sales_return: {
                    create: this.sales_return.map((x) => {
                        return {
                            bill_id: x.bill_id,
                            quantity: x.quantity,
                        };
                    }),
                },
            },
        });
    }
    static fetchArchive(year, month, offset, limit) {
        const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end_date = new Date(year, month, 1, 0, 0, 0, 0);
        return prisma.sales_return_code.findMany({
            where: {
                AND: [
                    {
                        date: {
                            gte: start_date,
                        },
                    },
                    {
                        date: {
                            lt: end_date,
                        },
                    },
                ],
            },
            orderBy: {
                date: "asc",
            },
            take: limit,
            skip: offset,
            select: {
                name: true,
                id: true,
                sales_return: {
                    take: 1,
                    select: {
                        bill: {
                            select: {
                                bill_code: {
                                    select: {
                                        customer: {
                                            select: {
                                                name: true,
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                date: true,
                user_sales_return_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                created_at: true,
                is_delete: true,
                is_confirm: true,
            },
        });
    }
    static fetchArchiveYears() {
        return prisma.$queryRaw `SELECT DISTINCT(YEAR(sales_return_code.date)) AS year FROM sales_return_code ORDER BY sales_return_code.date ASC`;
    }
    static countArchiveByYear() {
        return prisma.$queryRaw `SELECT COUNT(sales_return_code.id) AS count, YEAR(sales_return_code.date) AS year FROM sales_return_code GROUP BY YEAR(sales_return_code.date)`;
    }
    static countArchiveByMonth(year) {
        return prisma.$queryRaw `SELECT COUNT(sales_return_code.id) AS count, MONTH(sales_return_code.date) AS month FROM sales_return_code WHERE YEAR(sales_return_code.date) = ${year} GROUP BY MONTH(sales_return_code.date)`;
    }
    static countArchive(year, month) {
        const start_date = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const end_date = new Date(year, month, 1, 0, 0, 0, 0);
        return prisma.sales_return_code.count({
            where: {
                AND: [
                    {
                        date: {
                            gte: start_date,
                        },
                    },
                    {
                        date: {
                            lt: end_date,
                        },
                    },
                ],
            },
        });
    }
    static fetchById(id) {
        return prisma.sales_return_code.findUnique({
            where: {
                id: id,
            },
            select: {
                id: true,
                name: true,
                date: true,
                created_at: true,
                user_sales_return_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                sales_return: {
                    select: {
                        bill: {
                            select: {
                                quantity: true,
                                price: true,
                                discount: true,
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
                                bill_code: {
                                    select: {
                                        customer: {
                                            select: {
                                                name: true,
                                            }
                                        }
                                    }
                                }
                            },
                        },
                        quantity: true,
                    },
                },
                is_confirm: true,
                is_delete: true,
            },
        });
    }
    static deleteById(id, created_by) {
        return prisma.sales_return_code.update({
            where: {
                id: id
            },
            data: {
                is_confirm: false,
                is_delete: true,
                confirmed_at: new Date(),
                confirmed_by: created_by,
            }
        });
    }
}
exports.default = SalesReturnModel;
