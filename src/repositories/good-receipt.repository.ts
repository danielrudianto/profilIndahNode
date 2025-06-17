import { PrismaClient } from "@prisma/client";
import GoodReceiptModel, { IGoodReceipt } from "../model/good-receipt.model";
import {
  IFetchAnnualArchives,
  IFetchMonthlyArchives,
} from "../interface/fetch.interface";

export class GoodReceiptRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IGoodReceipt) {
    try {
      const checkExisting = await this.prisma.good_receipt_code.count({
        where: {
          uuid: data.uuid,
        },
      });

      if (checkExisting > 0) {
        throw new Error("Good receipt code with this UUID already exists.");
      }

      const result = await this.prisma.good_receipt_code.create({
        data: {
          uuid: data.uuid,
          name: data.name,
          created_by: data.created_by!,
          created_at: data.created_at,
          date: data.date,
          supplier_id: data.supplier_id,
          company_id: data.company_id,
          good_receipt: {
            createMany: {
              data: data.good_receipt!.map((item) => {
                return {
                  quantity: item.quantity,
                  price: item.price,
                  discount: item.discount,
                  product_id: item.item_id,
                  product_unit_id: item.item_unit_id,
                };
              }),
            },
          },
        },
        include: {
          good_receipt: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      return GoodReceiptModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async update(data: IGoodReceipt) {
    try {
      const result = await this.prisma.good_receipt_code.update({
        where: { id: data.id },
        data: {
          name: data.name,
          date: data.date,
          supplier_id: data.supplier_id,
          company_id: data.company_id,
          good_receipt: {
            deleteMany: {},
            createMany: {
              data: data.good_receipt!.map((item) => {
                return {
                  quantity: item.quantity,
                  price: item.price,
                  discount: item.discount,
                  product_id: item.item_id,
                  product_unit_id: item.item_unit_id,
                };
              }),
            },
          },
        },
      });

      return GoodReceiptModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async fetchByName(name: string): Promise<GoodReceiptModel | null> {
    try {
      const goodReceipt = await this.prisma.good_receipt_code.findFirst({
        where: {
          name: name,
          is_delete: false,
        },
        include: {
          supplier: true,
        },
      });

      return goodReceipt == null ? null : GoodReceiptModel.fromMap(goodReceipt);
    } catch (error) {
      throw error;
    }
  }

  async fetchByID(id: number): Promise<GoodReceiptModel | null> {
    try {
      const goodReceipt = await this.prisma.good_receipt_code.findUnique({
        where: {
          id: id,
        },
        include: {
          supplier: true,
          company: true,
          good_receipt: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      if (!goodReceipt) {
        return null;
      }

      return GoodReceiptModel.fromMap(goodReceipt);
    } catch (error) {
      throw error;
    }
  }

  async fetchAnnualArchives(): Promise<IFetchAnnualArchives[]> {
    try {
      const result = await this.prisma.$queryRaw<
        { year: number; count: number }[]
      >`
        SELECT 
          EXTRACT(YEAR FROM date) AS year,
          COUNT(id) AS count
        FROM good_receipt_code
        GROUP BY year
        ORDER BY year DESC;
      `;

      return result;
    } catch (error) {
      console.error(`[error]: Error while fetching annual archives: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchMonthlyArchives(year: number): Promise<IFetchMonthlyArchives[]> {
    try {
      const result = await this.prisma.$queryRaw<
        { month: number; count: number }[]
      >`
        SELECT 
          EXTRACT(MONTH FROM date) AS month,
          COUNT(id) AS count
        FROM good_receipt_code
        WHERE EXTRACT(YEAR FROM date) = ${year}
        GROUP BY month
        ORDER BY month;
      `;

      return result.map((x) => {
        return {
          year: year,
          month: x.month,
          count: x.count,
        };
      });
    } catch (error) {
      console.error(`[error]: Error while fetching monthly archives: ${error}`);
      throw new Error("Internal server error");
    }
  }
}
