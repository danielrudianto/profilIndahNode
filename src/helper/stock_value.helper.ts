import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class StockValueHelper {
    static fetchStockValue(date: Date){
        return prisma.$queryRawUnsafe(`CALL calculate_stock(${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, "0")})`);
    }
}

export default StockValueHelper;