import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
class QueryTransactionHelper {
    create(promises) {
        return prisma.$transaction(promises);
    }
}
export default QueryTransactionHelper;
