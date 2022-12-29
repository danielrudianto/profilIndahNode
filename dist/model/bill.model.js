"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BillModel {
    constructor(item_id, price, quantity, discount, bill_code_id) {
        this.item_id = item_id;
        this.price = price;
        this.quantity = quantity;
        this.discount = discount;
        this.bill_code_id = bill_code_id;
    }
    static create(bill) {
        return prisma.bill.createMany({
            data: bill,
        });
    }
    static fetchQuantitySoldByDate(date = new Date()) {
        return prisma.$queryRaw `
      SELECT SUM(quantity) AS quantity
      FROM bill
      JOIN bill_code
      ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${date.getMonth() + 1} AND DAY(bill_code.date) = ${date.getDate()}
    `;
    }
    static fetchMonthlyQuantitySoldByDate(date = new Date()) {
        return prisma.$queryRaw `
      SELECT SUM(quantity) AS quantity
      FROM bill
      JOIN bill_code
      ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${date.getMonth() + 1}
    `;
    }
    static fetchSoldByQuarter(quarter, year) {
        switch (quarter) {
            case 1:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(bill.quantity * (bill.price - bill.discount) * COALESCE(1, item_unit.conversion)) AS value, SUM(bill_code.discount) AS discount, SUM(bill_code.delivery) AS delivery
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date <= '${year}-03-31'
          AND bill_code.date >= '${year}-01-01'
        `);
            case 2:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(bill.quantity * (bill.price - bill.discount) * COALESCE(1, item_unit.conversion)) AS value, SUM(bill_code.discount) AS discount, SUM(bill_code.delivery) AS delivery
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date <= '${year}-06-30'
          AND bill_code.date >= '${year}-04-01'
        `);
            case 3:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(bill.quantity * (bill.price - bill.discount) * COALESCE(1, item_unit.conversion)) AS value, SUM(bill_code.discount) AS discount, SUM(bill_code.delivery) AS delivery
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date <= '${year}-09-30'
          AND bill_code.date >= '${year}-07-01'
        `);
            case 4:
                return prisma.$queryRawUnsafe(`
          SELECT SUM(bill.quantity * (bill.price - bill.discount) * COALESCE(1, item_unit.conversion)) AS value, SUM(bill_code.discount) AS discount, SUM(bill_code.delivery) AS delivery
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN item_unit ON bill.item_unit_id = item_unit.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND bill_code.date <= '${year}-12-31'
          AND bill_code.date >= '${year}-10-01'
        `);
            default:
                return new Promise((resolve, reject) => {
                    resolve([{
                            value: 0
                        }]);
                });
        }
    }
}
exports.default = BillModel;
