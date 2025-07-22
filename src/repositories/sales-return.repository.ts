import { PrismaClient } from "@prisma/client";
import { DateHelper, formatDate } from "../helper/date.helper";
import { IFetchAnnualArchives } from "../interface/fetch.interface";
import {
  ISalesReturnCode,
  SalesReturnCodeModel,
} from "../model/sales-return.model";

export class SalesReturnRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  create = async (data: ISalesReturnCode) => {
    try {
      const result = await this.prisma.sales_return_code.create({
        data: {
          name: data.name,
          date: data.date,
          created_at: data.created_at,
          created_by: data.created_by,
          is_confirm: true,
          is_delete: false,
          confirmed_at: new Date(),
          confirmed_by: data.confirmed_by,
          payment_method_id: data.payment_method_id,
          sales_return: {
            createMany: {
              data: data.sales_return!.map((x) => {
                return {
                  sales_invoice_id: x.sales_invoice_id,
                  quantity: x.quantity,
                };
              }),
            },
          },
        },
        include: {
          sales_return: {
            include: {
              sales_invoice: {
                include: {
                  product: true,
                  product_unit: true,
                },
              },
            },
          },
        },
      });

      if (!result) {
        return null;
      }

      return SalesReturnCodeModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  };

  fetchByID = async (id: number) => {
    try {
      const result = await this.prisma.sales_return_code.findUnique({
        where: {
          id: id,
        },
        include: {
          sales_return: {
            include: {
              sales_invoice: {
                include: {
                  product: true,
                  product_unit: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw error;
    }
  };

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

  async fetchPaymentsByDate(
    date: Date
  ): Promise<{ payment_method_id: number | null; value: number }[]> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT SUM(sales_return.quantity * (sales_invoice.price - sales_invoice.discount)) AS value,
        sales_return_code.payment_method_id
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        JOIN sales_invoice ON sales_return.sales_invoice_id = sales_invoice.id
        WHERE sales_return_code.date = ${DateHelper.convertDate(
          date,
          formatDate.YYYYMMDD
        )}
        AND sales_return_code.is_delete = 0
        GROUP BY sales_return_code.payment_method_id
      `;

      return result.map((x) => {
        return {
          payment_method_id: x.payment_method_id,
          value: Number(x.value),
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchAnnualArchives(): Promise<IFetchAnnualArchives[]> {
    try {
      const result = await this.prisma.$queryRaw<
        { year: number; month: number; count: BigInt }[]
      >`
        SELECT 
          EXTRACT(YEAR FROM date) AS year,
          EXTRACT(MONTH FROM date) AS month,
          COUNT(id) AS count
        FROM sales_return_code
        GROUP BY month, year
        ORDER BY date DESC;
      `;

      const years = Array.from(new Set(result.map((x) => x.year)));

      const filled = years.flatMap((year) =>
        Array.from({ length: 12 }, (_, i) => {
          const month: number = i + 1;
          const found = result.find(
            (x) => x.year === year && x.month === month
          );
          return {
            year: year,
            month: month,
            count: found ? Number(found.count) : 0,
          };
        })
      );

      return filled;
    } catch (error) {
      console.error(`[error]: Error while fetching annual archives: ${error}`);
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
        this.prisma.sales_return_code.findMany({
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
            user_sales_return_code_created_byTouser: {
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
        this.prisma.sales_return_code.count({
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
        data: result.map((x) => SalesReturnCodeModel.fromMap(x)),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error while fetching archives: ${error}`);
      throw new Error("Internal server error");
    }
  }
}
