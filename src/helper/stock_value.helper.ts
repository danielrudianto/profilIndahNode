import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class StockValueHelper {
  static fetchCOGS(startDate: Date, endDate: Date) {
    console.log(
      `CALL calculate_stock(STR_TO_DATE('${startDate.getFullYear()}-${(
        startDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${startDate
        .getDate()
        .toString()
        .padStart(
          2,
          "0"
        )}', '%Y-%m-%d'), STR_TO_DATE('${endDate.getFullYear()}-${(
        endDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${endDate
        .getDate()
        .toString()
        .padStart(2, "0")}', '%Y-%m-%d'))`
    );
    return prisma.$queryRawUnsafe(
      `CALL calculate_stock(STR_TO_DATE('${startDate.getFullYear()}-${(
        startDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${startDate
        .getDate()
        .toString()
        .padStart(
          2,
          "0"
        )}', '%Y-%m-%d'), STR_TO_DATE('${endDate.getFullYear()}-${(
        endDate.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${endDate
        .getDate()
        .toString()
        .padStart(2, "0")}', '%Y-%m-%d'))`
    );
  }

  static fetchValue(date: Date) {
    return prisma.$queryRawUnsafe(`CALL`);
  }
}

export default StockValueHelper;
