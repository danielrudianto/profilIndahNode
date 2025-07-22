import { PrismaClient } from "@prisma/client";

export class StockRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  update = async (itemID: number, quantity: number) => {};

  updateMany = async (items: { productID: number; quantity: number }[]) => {
    try {
      const updateData = [];
      for (let item of items) {
        updateData.push(
          this.prisma.product_stock.upsert({
            where: {
              id: item.productID,
            },
            create: {
              id: item.productID,
              stock: item.quantity,
            },
            update: {
              stock: {
                increment: item.quantity,
              },
            },
          })
        );
      }

      return this.prisma.$transaction(updateData);
    } catch (error) {
      throw error;
    }
  };

  fetchOutputReport = async (data: {
    product_id: number[];
    month: number;
    year: number;
  }) => {
    
  };
}
