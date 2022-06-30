"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class QueryTransactionHelper {
    create(promises) {
        return prisma.$transaction(promises);
    }
}
exports.default = QueryTransactionHelper;
