import { PrismaClient } from "@prisma/client";

export class SalesReturnRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }
}