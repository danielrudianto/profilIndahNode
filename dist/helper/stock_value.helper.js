"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class StockValueHelper {
    static fetchCOGS(date) {
        return prisma.$queryRawUnsafe(`CALL calculate_stock(STR_TO_DATE('${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${(date.getDate()).toString().padStart(2, "0")}', '%Y-%m-%d'))`);
    }
    static fetchValue(date) {
        return prisma.$queryRawUnsafe(`CALL`);
    }
}
exports.default = StockValueHelper;
