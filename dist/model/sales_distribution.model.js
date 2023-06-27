"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SalesDistributionModel {
    static fetchSum(month, year) {
        if (month == 0) {
            return prisma.$queryRawUnsafe(`
            SELECT SUM(value_out * stock_out_distribution.quantity) AS value, company_id, company.name
            FROM stock_out_distribution
            JOIN bill ON stock_out_distribution.bill_id = bill.id
            JOIN bill_code ON bill.bill_code_id = bill_code.id
            JOIN company ON company.id = company_id
            WHERE YEAR(bill_code.date) = ${year}
            GROUP BY company_id
            ORDER BY company.name ASC
        `);
        }
        else {
            return prisma.$queryRawUnsafe(`
        SELECT SUM(value_out * stock_out_distribution.quantity) AS value, company_id, company.name
        FROM stock_out_distribution
        JOIN bill ON stock_out_distribution.bill_id = bill.id
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        JOIN company ON company.id = company_id
        WHERE YEAR(bill_code.date) = ${year}
        AND MONTH(bill_code.date) = ${month}
        GROUP BY company_id
        ORDER BY company.name ASC
    `);
        }
    }
    static fetchValue() {
        return prisma.$transaction([
            prisma.$queryRaw `
      SELECT SUM(value) AS value FROM stock_out_distribution`,
            prisma.$queryRaw `
        SELECT SUM(value) AS value FROM stock_in
      `,
        ]);
    }
}
exports.default = SalesDistributionModel;
