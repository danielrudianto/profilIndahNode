import { PrismaClient } from "@prisma/client";

export class SalesReturnRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  fetchByBillIDs = async (billIDs: number[]) => {
    const result = await this.prisma.sales_return.count({
      where: {
        id: {
          in: billIDs,
        },
        sales_return_code: {
          is_delete: false,
          is_confirm: true,
        },
      },
    });

    return result > 0;
  };
}
