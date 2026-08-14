import { Prisma, PrismaClient } from "@prisma/client";
import {
  IFetchAnnualArchives,
  IFetchCommon,
  IFetchCommonResult,
} from "../interfaces/fetch.interface";
import { SalesDepositModel } from "../models/sales-deposit.model";
import { ISalesDepositCode } from "../interfaces/sales-deposit.interface";

export class SalesDepositRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
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
          sales: data.sales,
          customer_id: data.customerID,
          discount: data.discount,
          delivery: data.delivery,
          service: data.service,
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
    const keyword = data.keyword;
    const pattern = /^[retail]{1,6}$/i;

    let where = {};

    if (pattern.test(keyword) || keyword == "") {
      where = {
        is_delete: false,
        OR: [
          {
            name: {
              contains: data.keyword,
            },
          },
          {
            customer: null,
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
          {
            customer: null,
          },
          {
            sales_deposit: {
              some: {
                product: {
                  reference: {
                    contains: data.keyword,
                  },
                },
              },
            },
          },
          {
            sales_deposit: {
              some: {
                product: {
                  description: {
                    contains: data.keyword,
                  },
                },
              },
            },
          },
        ],
      };
    } else {
      where = {
        is_delete: false,
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
          {
            sales_deposit: {
              some: {
                product: {
                  reference: {
                    contains: data.keyword,
                  },
                },
              },
            },
          },
          {
            sales_deposit: {
              some: {
                product: {
                  description: {
                    contains: data.keyword,
                  },
                },
              },
            },
          },
        ],
      };
    }

    const result = await this.prisma.sales_deposit_code.findMany({
      where: where,
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

    const totalCount = await this.prisma.sales_deposit_code.count({
      where: where,
    });

    return {
      data: result.map((x) => SalesDepositModel.fromMap(x)),
      count: totalCount,
    };
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
        FROM sales_deposit_code
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
    isPending: boolean;
    isDelete: boolean;
    sortBy: string;
    sortDirection: "asc" | "desc";
    startDate: Date;
    endDate: Date;
  }) {
    let statusFilter: any = {};
    if (
      (!data.isPending && !data.isDelete) ||
      (data.isPending && data.isDelete)
    ) {
      statusFilter = {
        OR: [
          {
            is_delete: false,
          },
          {
            is_delete: true,
          },
        ],
      };
    } else if (data.isPending) {
      statusFilter = {
        is_delete: false,
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
  }

  async fetchByID(id: number) {
    try {
      const result = await this.prisma.sales_deposit_code.findFirst({
        where: {
          id: id,
        },
        include: {
          customer: true,
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

  async calculatePendingStock(product_id: number[]) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT SUM(sales_deposit.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, 
      sales_deposit.product_id
      FROM sales_deposit
      JOIN sales_deposit_code ON sales_deposit.sales_deposit_code_id = sales_deposit_code.id
      JOIN product ON sales_deposit.product_id = product.id
      LEFT JOIN product_unit ON product.id = product_unit.product_id
      WHERE sales_deposit_code.is_delete = 0
      AND sales_deposit.product_id IN (${Prisma.join(product_id)})
      GROUP BY sales_deposit.product_id
    `;

    return result.map((x) => {
      return {
        quantity: Number(x.quantity),
        product_id: Number(x.product_id),
      };
    });
  }

  async countPending() {
    const result = await this.prisma.sales_deposit.count({
      where: {
        is_delete: false,
      },
    });

    return result;
  }

  /*
    salesInvoiceCodeID adalah faktur yang lahir dari setoran ini. Kaitannya dulu
    hanya tersirat lewat penomoran faktur yang diberi awalan DPS-; sejak migrasi
    20260814010000_sales_deposit_invoice_link kaitannya punya kolom sendiri, dan
    fakturnya kembali memakai penomoran faktur biasa.

    Penandaannya memang memakai is_delete, bukan is_confirm — sales_deposit_code
    tidak punya kolom is_confirm, dan setoran yang sudah menjadi faktur memang
    tidak boleh muncul lagi di daftar setoran terbuka. Penjaga di awal confirm()
    membaca kedua keadaan itu lewat isDelete, jadi penandaan ini pula yang
    menutup pintu konfirmasi kedua.
  */
  async confirmByID(
    id: number,
    userID: number,
    salesInvoiceCodeID: number,
    tx?: Prisma.TransactionClient
  ) {
    await (tx ?? this.prisma).sales_deposit_code.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: userID,
        sales_invoice_code_id: salesInvoiceCodeID,
      },
    });
  }

  async delete(id: number, userID: number) {
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
  }
}
