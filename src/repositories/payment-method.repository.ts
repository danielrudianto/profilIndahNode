import { PrismaClient } from "@prisma/client";

export class PaymentMethodRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }
}
