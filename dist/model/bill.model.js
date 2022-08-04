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
}
exports.default = BillModel;
