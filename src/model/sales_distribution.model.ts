import { PrismaClient, stock_out_distribution } from "@prisma/client";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "stdout",
      level: "error",
    },
    {
      emit: "stdout",
      level: "info",
    },
    {
      emit: "stdout",
      level: "warn",
    },
  ],
});

prisma.$on("query", (e) => {
  console.log("Query: " + e.query);
  console.log("Duration: " + e.duration + "ms");
});

class SalesDistributionModel {
  static fetchSum(month: number, year: number) {
    if (month == 0) {
      return prisma.$queryRawUnsafe<stock_out_distribution[]>(`
            SELECT SUM(value_out * stock_out_distribution.quantity) AS value, company_id, company.name
            FROM stock_out_distribution
            JOIN bill ON stock_out_distribution.bill_id = bill.id
            JOIN bill_code ON bill.bill_code_id = bill_code.id
            JOIN company ON company.id = company_id
            WHERE YEAR(bill_code.date) = ${year}
            GROUP BY company_id
            ORDER BY company.name ASC
        `);
    } else {
      return prisma.$queryRawUnsafe<stock_out_distribution[]>(`
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
}

export default SalesDistributionModel;
