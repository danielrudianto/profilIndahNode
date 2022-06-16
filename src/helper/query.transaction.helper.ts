import { PrismaClient, PrismaPromise } from "@prisma/client";

const prisma = new PrismaClient();

class QueryTransactionHelper {
    create(promises: PrismaPromise<any>[]){
        return prisma.$transaction(promises);
    }
}

export default QueryTransactionHelper;