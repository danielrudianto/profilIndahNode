import { PrismaClient } from "@prisma/client";
import {
  IStockIn,
  IStockInUpdate,
  StockInModel,
} from "../model/stock-in.model";

export class StockInRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  createMany(data: IStockIn[]) {
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

  updateMany(data: IStockInUpdate[]) {
    return this.prisma.$transaction(
      data.map((x) => {
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
      })
    );
  }

  async bulkUpdate(bulkUpdates: Array<any>) {
    const operations = [];

    for (const update of bulkUpdates) {
      if (update.type === "update") {
        operations.push(
          this.prisma.stock_in.update({
            where: { id: update.stockInID },
            data: {
              residue: update.residue,
            },
          })
        );

        operations.push(
          this.prisma.stock_out.update({
            where: {
              id: update.stockOutID,
            },
            data: {
              stock_in_id: update.stockInID,
            },
          })
        );
      }

      if (update.type === "updateAndCreate") {
        operations.push(
          this.prisma.stock_in.update({
            where: { id: update.stockInID },
            data: {
              residue: 0,
            },
          })
        );

        operations.push(
          this.prisma.stock_out.update({
            where: {
              id: update.stockOutID,
            },
            data: {
              quantity: update.quantity,
              stock_in_id: update.stockInID,
            },
          })
        );

        operations.push(
          this.prisma.stock_out.create({
            data: update.stockOut,
          })
        );
      }
    }

    // 🔥 Execute all operations in parallel
    await this.prisma.$transaction(operations);
  }

  async deleteMany(data: IStockInUpdate[]) {
    try {
      const where = [];
      for (let i = 0; i < data.length; i++) {
        where.push({
          adjustment_case_id: data[i].adjustment_case_id,
          adjustment_case_code_id: data[i].adjustment_case_code_id,
          good_receipt_id: data[i].good_receipt_id,
          good_receipt_code_id: data[i].good_receipt_code_id,
        });
      }

      const stockIns = await this.prisma.stock_in.findMany({
        where: {
          OR: where,
        },
        include: {
          stock_out: {
            select: {
              id: true,
            },
          },
        },
      });

      const deleteQuery: any[] = [];
      const updateQuery: any[] = [];
      stockIns.forEach((stockIn) => {
        deleteQuery.push(
          this.prisma.stock_in.delete({
            where: {
              id: stockIn.id,
            },
          })
        );

        stockIn.stock_out.forEach((stockOut) => {
          updateQuery.push(
            this.prisma.stock_out.update({
              where: {
                id: stockOut.id,
              },
              data: {
                stock_in_id: null,
              },
            })
          );
        });
      });

      await this.prisma.$transaction(updateQuery);
      await this.prisma.$transaction(deleteQuery);
    } catch (error) {
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
        SELECT good_receipt.product_id, good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion), 
        (good_receipt.price - good_receipt.discount) / IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion), good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion),
        NULL, NULL, good_receipt.id, good_receipt.good_receipt_code_id, good_receipt_code.company_id, good_receipt_code.date
        FROM good_receipt
        LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        WHERE good_receipt_code.is_delete = 0
        ORDER BY good_receipt_code.date ASC, good_receipt_code.id ASC
      `);
    } catch (error) {
      throw error;
    }
  }

  async insertFromAdjustmentCases() {
    try {
      await this.prisma.$queryRawUnsafe(`
        INSERT INTO stock_in (product_id, quantity, price, residue, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id, company_id, date)
        SELECT adjustment_case.product_id, adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion), 
        adjustment_case.price / IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion), 
        adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion),
        adjustment_case.id, adjustment_case.adjustment_case_code_id, NULL, NULL, adjustment_case_code.company_id, adjustment_case_code.date
        FROM adjustment_case
        LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        WHERE adjustment_case_code.is_delete = 0
        AND adjustment_case.quantity > 0
        ORDER BY adjustment_case_code.date ASC, adjustment_case_code.id ASC
      `);
    } catch (error) {
      throw error;
    }
  }

  async update(data: {
    stockInID: number;
    stockOutID: number;
    residue: number;
  }) {
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

  async updateAndCreate(data: {
    stockInID: number;
    stockOutID: number;
    residue: number;
    stockOut: any;
  }) {
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

  async fetchUnfilled(productID: number) {
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

    return stockIn == null
      ? null
      : {
          ...stockIn,
          residue: Number(stockIn.residue),
          quantity: Number(stockIn.quantity),
        };
  }

  async fetchManyUnfilled(productIDs: number[]) {
    const stockIn = await this.prisma.stock_in.findMany({
      where: {
        residue: {
          gt: 0,
        },
        product_id: {
          in: productIDs,
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    return stockIn.map((x) => {
      return {
        id: x.id,
        quantity: Number(x.quantity),
        residue: Number(x.residue),
        product_id: x.product_id,
      };
    });
  }

  async calculate(): Promise<{ company: string; value: number }[]> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
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
    } catch (error) {
      throw error;
    }
  }
}
