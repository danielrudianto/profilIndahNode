import { PrismaClient, stock_out_distribution } from "@prisma/client";

const prisma = new PrismaClient();

class SalesDistributionModel {
  static fetchSum(month: number, year: number) {
    if (month == 0) {
      return prisma.$queryRawUnsafe<stock_out_distribution[]>(`
            SELECT stock_out_distribution.*
            FROM stock_out_distribution
            JOIN bill ON stock_out_distribution.bill_id = bill.id
            JOIN bill_code ON bill.bill_code_id = bill_code.id
            WHERE YEAR(bill_code.date) = ${year}
        `);
    } else {
      return prisma.$queryRawUnsafe<stock_out_distribution[]>(`
        SELECT stock_out_distribution.*
        FROM stock_out_distribution
        JOIN bill ON stock_out_distribution.bill_id = bill.id
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        WHERE YEAR(bill_code.date) = ${year}
        AND MONTH(bill_code.date) = ${month}
    `);
    }
  }
}

export default SalesDistributionModel;
