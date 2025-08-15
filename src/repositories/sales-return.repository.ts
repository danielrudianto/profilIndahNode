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
          sales_invoice_code_id: data.sales_invoice_code_id,
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
          sales_invoice_code: true,
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
          payment_method: true,
          user_sales_return_code_created_byTouser: {
            include: {
              user_avatar: true,
            },
          },
          sales_invoice_code: {
            include: {
              customer: true,
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

  fetchBySalesInvoiceCodeID = async (id: number) => {
    try {
      const result = await this.prisma.sales_return_code.findFirst({
        where: {
          sales_invoice_code_id: id,
          is_delete: false,
          is_confirm: true,
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

      return result ? SalesReturnCodeModel.fromMap(result) : null;
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
        ORDER BY year DESC, month DESC;
      `;

      return result.map((x) => {
        return {
          year: Number(x.year),
          month: Number(x.month),
          count: Number(x.count),
        };
      });
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
    isActive: boolean;
    isDelete: boolean;
  }) {
    try {
      let formattedIsActive: boolean = data.isActive;
      let formattedIsDelete: boolean = data.isDelete;

      if (!data.isActive && !data.isDelete) {
        formattedIsActive = true;
        formattedIsDelete = true;
      }

      let statusFilter: any[] = [];

      if (formattedIsActive) {
        statusFilter.push({
          is_delete: false,
        });
      }

      if (formattedIsDelete) {
        statusFilter.push({
          is_delete: true,
        });
      }

      const [result, count] = await Promise.all([
        this.prisma.sales_return_code.findMany({
          where: {
            AND: [
              {
                date: {
                  gte: new Date(data.year, data.month - 1, 1),
                },
              },
              {
                date: {
                  lt: new Date(data.year, data.month, 1),
                },
              },
              {
                OR: [
                  {
                    name: {
                      contains: data.keyword,
                    },
                  },
                ],
              },
              {
                OR: statusFilter,
              },
            ],
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
            AND: [
              {
                date: {
                  gte: new Date(data.year, data.month - 1, 1),
                },
              },
              {
                date: {
                  lt: new Date(data.year, data.month, 1),
                },
              },
              {
                OR: [
                  {
                    name: {
                      contains: data.keyword,
                    },
                  },
                ],
              },
              {
                OR: statusFilter,
              },
            ],
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

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.sales_return_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          is_confirm: false,
          confirmed_at: new Date(),
          confirmed_by: userID,
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
          sales_invoice_code: true,
        },
      });

      return SalesReturnCodeModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }
}
