"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class StockValueHelper {
    static fetchCOGS(startDate, endDate) {
        return prisma.$queryRawUnsafe(`CALL calculate_stock(STR_TO_DATE('${startDate.getFullYear()}-${(startDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${startDate
            .getDate()
            .toString()
            .padStart(2, "0")}', '%Y-%m-%d'), STR_TO_DATE('${endDate.getFullYear()}-${(endDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${endDate
            .getDate()
            .toString()
            .padStart(2, "0")}', '%Y-%m-%d'))`);
    }
    static fetchValue(date) {
        return prisma.$queryRawUnsafe(`CALL`);
    }
}
exports.default = StockValueHelper;
//# sourceMappingURL=stock_value.helper.js.map