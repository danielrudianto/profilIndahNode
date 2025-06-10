import { PrismaClient } from "@prisma/client";

export class StockOutRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }
}
