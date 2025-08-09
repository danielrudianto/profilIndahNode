import { PrismaClient } from "@prisma/client";
import {
  IFetchAnnualArchives,
  IFetchCommon,
  IFetchCommonResult,
} from "../interface/fetch.interface";
import {
  ISalesDepositCode,
  SalesDepositModel,
} from "../model/sales-deposit.model";

export class SalesDepositRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: ISalesDepositCode) {
    try {
      const result = await this.prisma.sales_deposit_code.create({
        data: {
          uuid: data.uuid,
          name: data.name,
          date: data.date,
          created_by: data.createdBy!,
          created_at: data.createdAt!,
          is_delete: false,
          deleted_at: null,
          deleted_by: null,
          type: data.type,
          sales_deposit: {
            createMany: {
              data: data.sales_deposit.map((x) => {
                return {
                  product_id: x.product_id,
                  product_unit_id: x.product_unit_id,
                  quantity: x.quantity,
                  price: x.price,
                  discount: x.discount,
                };
              }),
            },
          },
          sales_deposit_payment: {
            createMany: {
              data: data.sales_deposit_payment.map((x) => {
                return {
                  payment_method_id: x.payment_method_id,
                  value: x.value,
                  date: x.date,
                };
              }),
            },
          },
        },
        include: {
          sales_deposit: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      return SalesDepositModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while creating deposit: ${error}`);
      throw new Error("Internal server error");
    }
  }

  generateName(date: Date = new Date()) {
    return `DPS-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;
  }

  async fetchByProductID(productID: number[]): Promise<number[]> {
    try {
      // fetch the sums
      const deposits = await this.prisma.sales_deposit.groupBy({
        by: ["product_id"],
        _sum: {
          quantity: true,
        },
        where: {
          product_id: {
            in: productID,
          },
          is_delete: false,
        },
      });

      const response: {
        product_id: number;
        quantity: number;
      }[] = [];

      for (let i = 0; i < productID.length; i++) {
        const product = productID[i];
        const deposit = deposits.find((d) => d.product_id === product);
        response.push({
          product_id: product,
          quantity: deposit ? Number(deposit) : 0,
        });
      }

      return response.map((d) => {
        return d.quantity;
      });
    } catch (error) {
      console.error(`[error]: Error on fetching deposits ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetch(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<SalesDepositModel>> {
    try {
      const result = await this.prisma.sales_deposit_code.findMany({
        where: {
          is_delete: false,
        },
        include: {
          customer: true,
          sales_deposit: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
        orderBy: {
          id: "desc",
        },
      });

      const totalCount = await this.prisma.sales_deposit.count({
        where: {
          is_delete: false,
        },
      });

      return {
        data: result.map((x) => SalesDepositModel.fromMap(x)),
        count: totalCount,
      };
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
        FROM deposit_code
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
    month: number;
    year: number;
    keyword: string;
    limit: number;
    offset: number;
    isActive: boolean;
    isDelete: boolean;
    sortBy: string;
    sortDirection: "asc" | "desc";
  }) {
    try {
      let statusFilter: any = {};
      if (
        (!data.isActive && !data.isDelete) ||
        (data.isActive && data.isDelete)
      ) {
        statusFilter = {
          OR: [
            {
              is_confirm: true,
            },
            {
              is_delete: true,
            },
          ],
        };
      } else if (data.isActive) {
        statusFilter = {
          is_confirm: true,
        };
      } else {
        statusFilter = {
          is_delete: true,
        };
      }

      let orderBy;

      if (data.sortBy == "date") {
        orderBy = {
          date: data.sortDirection,
        };
      } else if (data.sortBy == "name") {
        orderBy = {
          name: data.sortDirection,
        };
      } else if (data.sortBy === "customer") {
        orderBy = {
          customer: {
            name: data.sortDirection,
          },
        };
      } else if (data.sortBy == "sales") {
        orderBy = {
          sales: data.sortDirection,
        };
      }

      const [result, count] = await this.prisma.$transaction([
        this.prisma.sales_deposit_code.findMany({
          where: {
            AND: [
              {
                date: {
                  gt: new Date(data.year, data.month - 1, 1),
                },
              },
              {
                date: {
                  lte: new Date(data.year, data.month, 0),
                },
              },
              {
                OR: [
                  {
                    name: {
                      contains: data.keyword,
                    },
                  },
                  {
                    sales: {
                      contains: data.keyword,
                    },
                  },
                  {
                    customer: {
                      name: {
                        contains: data.keyword,
                      },
                    },
                  },
                ],
              },
              statusFilter,
            ],
          },
          orderBy: orderBy,
          include: {
            customer: true,
          },
          take: data.limit,
          skip: data.offset,
        }),
        this.prisma.sales_deposit_code.count({
          where: {
            AND: [
              {
                date: {
                  gt: new Date(data.year, data.month - 1, 1),
                },
              },
              {
                date: {
                  lte: new Date(data.year, data.month, 0),
                },
              },
              {
                OR: [
                  {
                    name: {
                      contains: data.keyword,
                    },
                  },
                  {
                    sales: {
                      contains: data.keyword,
                    },
                  },
                  {
                    customer: {
                      name: {
                        contains: data.keyword,
                      },
                    },
                  },
                ],
              },
              statusFilter,
            ],
          },
        }),
      ]);

      return {
        data: result.map((x) => {
          return SalesDepositModel.fromMap(x);
        }),
        count: count,
      };
    } catch (error) {
      throw error;
    }
  }

  async fetchByID(id: number) {
    try {
      const result = await this.prisma.sales_deposit_code.findFirst({
        where: {
          id: id,
          is_delete: false,
        },
        include: {
          sales_deposit: {
            include: {
              product: true,
              product_unit: true,
            },
          },
          sales_deposit_payment: {
            include: {
              payment_method: true,
            },
          },
          user_bill_code_created_byTouser: {
            include: {
              user_avatar: true,
            },
          },
          user_bill_code_confirmed_byTouser: {
            include: {
              user_avatar: true,
            },
          },
        },
      });

      if (!result) {
        return null;
      }

      return SalesDepositModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on fetching deposit by ID ${error}`);
      throw new Error("Internal server error");
    }
  }

  async confirmByID(id: number, userID: number) {
    try {
      const result = await this.prisma.sales_deposit_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_at: new Date(),
          deleted_by: userID,
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.sales_deposit_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
        include: {
          sales_deposit: {
            include: {
              product: true,
              product_unit: true,
            },
          },
          sales_deposit_payment: true,
        },
      });

      return SalesDepositModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }
}
