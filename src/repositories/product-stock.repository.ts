import { PrismaClient } from "@prisma/client";

class ProductStockRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async incrementStock(productID: number, quantity: number) {
    try {
      //update or insert stock
      const result = await this.prisma.stock.upsert({
        where: { id: productID },
        update: {
          stock: {
            increment: quantity,
          },
        },
        create: {
          id: productID,
          stock: quantity,
        },
      });
    } catch (error) {
      console.error(`[error]: Error on incrementing stock: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchStock(productID: number[]) {
    try {
      const stocks = await this.prisma.stock.findMany({
        where: {
          id: {
            in: productID,
          },
        },
        select: {
          id: true,
          stock: true,
        },
      });

      return stocks.map((stock) => ({
        id: stock.id,
        stock: stock.stock,
      }));
    } catch (error) {
      console.error(`[error]: Error on fetching stock: ${error}`);
      throw new Error("Internal server error");
    }
  }
}
