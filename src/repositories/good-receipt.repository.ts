import { PrismaClient } from "@prisma/client";
import GoodReceiptModel, { IGoodReceipt } from "../model/good-receipt.model";
import {
  IFetchAnnualArchives,
  IFetchCommon,
  IFetchCommonResult,
  IFetchMonthlyArchives,
} from "../interface/fetch.interface";
import { DateHelper, formatDate } from "../helper/date.helper";

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
          confirmed_at: data.confirmed_at,
          confirmed_by: data.confirmed_by,
          date: data.date,
          supplier_id: data.supplier_id,
          company_id: data.company_id,
          invoice_name: data.invoice_name,
          faktur: data.faktur,
          good_receipt: {
            createMany: {
              data: data.good_receipt!.map((item) => {
                return {
                  quantity: item.quantity,
                  price: item.price,
                  discount: item.discount,
                  product_id: item.product_id,
                  product_unit_id: item.product_unit_id,
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
      console.error("Error creating good receipt:", error);
      throw new Error("Failed to create good receipt");
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
                  product_id: item.product_id,
                  product_unit_id: item.product_unit_id,
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

  async delete(id: number, userID: number): Promise<GoodReceiptModel> {
    try {
      const result = await this.prisma.good_receipt_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          confirmed_by: userID,
          confirmed_at: new Date(),
        },
      });

      return GoodReceiptModel.fromMap(result);
    } catch (error) {
      console.error("Error deleting good receipt:", error);
      throw new Error("Failed to delete good receipt");
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

  async fetchUnconfirmed(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<GoodReceiptModel>> {
    try {
      const [result, count] = await Promise.all([
        this.prisma.good_receipt_code.findMany({
          where: {
            is_confirm: false,
            is_delete: false,
          },
          include: {
            supplier: true,
            company: true,
            user_good_receipt_code_created_byTouser: {
              include: {
                user_avatar: true,
              },
            },
          },
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
          orderBy: {
            date: "desc",
          },
        }),
        this.prisma.good_receipt_code.count({
          where: {
            is_confirm: false,
            is_delete: false,
          },
        }),
      ]);

      return {
        data: result.map((x) => GoodReceiptModel.fromMap(x)),
        count: count,
      };
    } catch (error) {
      console.error(
        `[error]: Error while fetching unconfirmed good receipts: ${error}`
      );
      throw new Error("Internal server error");
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

  async fetchArchives(data: {
    year: number;
    month: number;
    keyword: string;
    page: number;
    pageSize: number;
    filterObject?: {
      isDelete: boolean;
    };
  }) {
    try {
      const [result, count] = await Promise.all([
        this.prisma.good_receipt_code.findMany({
          where: {
            date: {
              gte: new Date(data.year, data.month - 1, 1),
              lt: new Date(data.year, data.month, 1),
            },
            name: {
              contains: data.keyword,
            },
            is_delete:
              data.filterObject == undefined
                ? undefined
                : data.filterObject.isDelete,
          },
          include: {
            supplier: true,
            company: true,
            user_good_receipt_code_created_byTouser: {
              include: {
                user_avatar: true,
              },
            },
          },
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
          orderBy: {
            date: "desc",
          },
        }),
        this.prisma.good_receipt_code.count({
          where: {
            date: {
              gte: new Date(data.year, data.month - 1, 1),
              lt: new Date(data.year, data.month, 1),
            },
            name: {
              contains: data.keyword,
            },
            is_delete:
              data.filterObject == undefined
                ? undefined
                : data.filterObject.isDelete,
          },
        }),
      ]);

      return {
        data: result.map((x) => GoodReceiptModel.fromMap(x)),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error while fetching archives: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByDateRange(minimumDate: Date, maximumDate: Date) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT SUM(gr.value + good_receipt_code.service + good_receipt_code.delivery - good_receipt_code.discount) AS value
      FROM good_receit_code
      JOIN (
        SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt.good_receipt_code_id
        FROM good_receipt
        GROUP BY good_receipt.good_receipt_code_id
      ) gr
      JOIN good_receipt_code.id = gr.good_receipt_code_id
      WHERE good_receipt_code.is_delete = 0
      AND good_receipt_code.date BETWEEN ${DateHelper.convertDate(
        minimumDate,
        formatDate.DDMMYYYY
      )} AND ${DateHelper.convertDate(maximumDate, formatDate.DDMMYYYY)}
    `;

    if (!result || result.length == 0) {
      return 0;
    }

    return result[0].value;
  }
}
