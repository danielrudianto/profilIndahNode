import { PrismaClient } from "@prisma/client";
import { DateHelper, formatDate } from "../utils/date.helper";
import { IFetchAnnualArchives } from "../interfaces/fetch.interface";
import { SalesReturnCodeModel } from "../models/sales-return.model";
import { ISalesReturnCode } from "../interfaces/sales-return.interface";

export class SalesReturnRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  create = async (data: ISalesReturnCode) => {
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
  };

  async updateProductStock() {
    const result = await this.prisma.sales_return.findMany({
      where: {
        sales_return_code: {
          is_delete: false,
        },
      },
      include: {
        sales_invoice: {
          include: {
            product_unit: true,
          },
        },
      },
    });

    const response: any[] = [];
    result.forEach((x) => {
      const index = response.findIndex(
        (r) => r.product_id === x.sales_invoice.product_id
      );
      if (index < 0) {
        response.push({
          product_id: x.sales_invoice.product_id,
          quantity:
            Number(x.quantity) *
            (x.sales_invoice.product_unit == null
              ? 1
              : Number(x.sales_invoice.product_unit.conversion)),
        });
      } else {
        response[index].quantity +=
          Number(x.quantity) *
          (x.sales_invoice.product_unit == null
            ? 1
            : Number(x.sales_invoice.product_unit.conversion));
      }
    });

    return response;
  }

  fetchByID = async (id: number) => {
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
  };

  fetchBySalesInvoiceCodeID = async (id: number) => {
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
  }

  /**
   * Nilai dan jumlah retur sebulan, untuk kartu retur di laporan
   * penjualan. Nilainya harga faktur asal netto dikali kuantitas retur.
   */
  async fetchMonthlyReturn(
    month: number,
    year: number
  ): Promise<{ value: number; count: number }> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT
          COALESCE(SUM(sales_return.quantity * (sales_invoice.price - sales_invoice.discount)), 0) AS value,
          COUNT(DISTINCT sales_return_code.id) AS count
        FROM sales_return_code
        JOIN sales_return ON sales_return.sales_return_code_id = sales_return_code.id
        JOIN sales_invoice ON sales_invoice.id = sales_return.sales_invoice_id
        WHERE sales_return_code.is_delete = false
          AND MONTH(sales_return_code.date) = ${month}
          AND YEAR(sales_return_code.date) = ${year}
      `;

      return {
        value: Number(result[0]?.value ?? 0),
        count: Number(result[0]?.count ?? 0),
      };
    } catch (error) {
      console.error(`[error]: Error on fetching monthly return ${error}`);
      throw new Error("Internal server error");
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
    startDate: Date;
    endDate: Date;
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
                date: {
                  gte: data.startDate,
                },
              },
              {
                date: {
                  lte: data.endDate,
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
            sales_invoice_code: {
              include: {
                customer: true,
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
                date: {
                  gte: data.startDate,
                },
              },
              {
                date: {
                  lte: data.endDate,
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
  }
}
