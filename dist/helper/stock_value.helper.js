import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
class StockValueHelper {
    static fetchCOGS(date) {
        return prisma.$queryRawUnsafe(`CALL calculate_stock(STR_TO_DATE('${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, "0")}', '%Y-%m-%d'))`);
    }
}
export default StockValueHelper;
