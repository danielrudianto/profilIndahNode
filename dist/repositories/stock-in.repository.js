"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockInRepository = void 0;
class StockInRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) { }
    createMany(data) {
        return this.prisma.stock_in.createMany({
            data: data.map((x) => {
                return {
                    date: x.date,
                    product_id: x.product_id,
                    quantity: x.quantity,
                    price: x.price,
                    company_id: x.company_id,
                    residue: x.quantity,
                    adjustment_case_code_id: x.adjustment_case_code_id,
                    adjustment_case_id: x.adjustment_case_id,
                    good_receipt_code_id: x.good_receipt_code_id,
                    good_receipt_id: x.good_receipt_id,
                };
            }),
        });
    }
    updateMany(data) {
        return this.prisma.$transaction(data.map((x) => {
            return this.prisma.stock_in.updateMany({
                where: {
                    good_receipt_id: x.good_receipt_id,
                    good_receipt_code_id: x.good_receipt_code_id,
                    adjustment_case_id: x.adjustment_case_id,
                    adjustment_case_code_id: x.adjustment_case_code_id,
                },
                data: {
                    price: x.price,
                },
            });
        }));
    }
    async deleteMany(data) {
        try {
            const stockIns = await this.prisma.$transaction(data.map((x) => {
                return this.prisma.stock_in.findMany({
                    where: {
                        OR: [
                            {
                                AND: [
                                    {
                                        adjustment_case_id: x.adjustment_case_id,
                                    },
                                    {
                                        adjustment_case_code_id: x.adjustment_case_code_id,
                                    },
                                ],
                            },
                            {
                                AND: [
                                    {
                                        good_receipt_id: x.good_receipt_id,
                                    },
                                    {
                                        good_receipt_code_id: x.good_receipt_code_id,
                                    },
                                ],
                            },
                        ],
                    },
                    include: {
                        stock_out: {
                            select: {
                                id: true,
                            },
                        },
                    },
                });
            }));
            const stockInFlat = stockIns.flat();
            if (stockInFlat.length == 0) {
                return;
            }
            const updateQuery = stockInFlat.flatMap((x) => {
                return x.stock_out.map((z) => {
                    return this.prisma.stock_out.update({
                        where: {
                            id: z.id,
                        },
                        data: {
                            stock_in_id: null,
                        },
                    });
                });
            });
            const deleteQuery = stockInFlat.map((x) => {
                return this.prisma.stock_in.delete({
                    where: {
                        id: x.id,
                    },
                });
            });
            await this.prisma.$transaction([...updateQuery, ...deleteQuery]);
        }
        catch (error) {
            throw error;
        }
    }
    async deleteAll() {
        await this.prisma.stock_in.deleteMany({});
    }
    async insertFromGoodReceipts() {
        try {
            await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_in (product_id, quantity, price, residue, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id, company_id, date)
        SELECT good_receipt.product_id, good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion), (good_receipt.price - good_receipt.discount) / IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion), good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion),
        NULL, NULL, good_receipt.id, good_receipt.good_receipt_code_id, good_receipt_code.company_id, good_receipt_code.date
        FROM good_receipt
        LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        WHERE good_receipt_code.is_delete = 0
        ORDER BY good_receipt_code.date ASC, good_receipt.id ASC
      `);
        }
        catch (error) {
            throw error;
        }
    }
    async insertFromAdjustmentCases() {
        try {
            await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_in (product_id, quantity, price, residue, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id, company_id, date)
        SELECT adjustment_case.product_id, adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion), 0, adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion),
        adjustment_case.id, adjustment_case.adjustment_case_code_id, NULL, NULL, adjustment_case_code.company_id, adjustment_case_code.date
        FROM adjustment_case
        LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        WHERE adjustment_case_code.is_delete = 0
        AND adjustment_case.quantity > 0
        ORDER BY adjustment_case_code.date ASC, good_receipt.id ASC
      `);
        }
        catch (error) {
            throw error;
        }
    }
    async update(data) {
        const result = await this.prisma.$transaction([
            this.prisma.stock_in.update({
                where: {
                    id: data.stockInID,
                },
                data: {
                    residue: data.residue,
                },
            }),
            this.prisma.stock_out.update({
                where: {
                    id: data.stockOutID,
                },
                data: {
                    stock_in_id: data.stockInID,
                },
            }),
        ]);
    }
    async updateAndCreate(data) {
        return this.prisma.$transaction([
            this.prisma.stock_out.create({
                data: data.stockOut,
            }),
            this.prisma.stock_in.update({
                where: {
                    id: data.stockInID,
                },
                data: {
                    residue: 0,
                },
            }),
            this.prisma.stock_out.update({
                where: {
                    id: data.stockOutID,
                },
                data: {
                    quantity: data.residue,
                },
            }),
        ]);
    }
    async fetchUnfilled(productID) {
        const stockIn = await this.prisma.stock_in.findFirst({
            where: {
                residue: {
                    gt: 0,
                },
                product_id: productID,
            },
            orderBy: {
                date: "asc",
            },
        });
        return stockIn;
    }
    async calculate() {
        try {
            const result = await this.prisma.$queryRaw `
      SELECT company.name, c.value
      FROM company
      LEFT JOIN (
        SELECT SUM(stock_in.price * stock_in.residue) AS value, stock_in.company_id
        FROM stock_in
        GROUP BY stock_in.company_id
      ) AS c
      ON company.id = c.company_id
      ORDER BY value DESC
    `;
            if (!result || result.length == 0) {
                return [];
            }
            return result.map((x) => {
                return {
                    company: x.name,
                    value: Number(x.value),
                };
            });
        }
        catch (error) {
            throw error;
        }
    }
}
exports.StockInRepository = StockInRepository;
//# sourceMappingURL=stock-in.repository.js.map