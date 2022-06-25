import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class BillModel {
  static countItemByReference(reference: string) {
    return prisma.bill.count({
      where: {
        item: {
          reference: reference,
        },
      },
    });
  }
}

export default BillModel;
