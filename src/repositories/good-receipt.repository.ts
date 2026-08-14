import { PrismaClient } from "@prisma/client";
import GoodReceiptModel, { IGoodReceipt } from "../models/good-receipt.model";
import {
  IFetchAnnualArchives,
  IFetchCommon,
  IFetchCommonResult,
} from "../interfaces/fetch.interface";

import { DateHelper, formatDate } from "../utils/date.helper";
import ErrorList from "../constants/error_list";

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
          is_confirm: data.is_confirm,
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
            where: {
              is_delete: false,
            },
          },
        },
      });

      if (!result) {
        throw new Error(ErrorList["Good receipt creation failed"]);
      }

      return GoodReceiptModel.fromMap(result);
    } catch (error) {
      console.error("Error creating good receipt:", error);
      throw new Error("Failed to create good receipt");
    }
  }

  async update(data: IGoodReceipt) {
    const result = await this.prisma.good_receipt_code.update({
      where: { id: data.id },
      data: {
        name: data.name,
        invoice_name: data.invoice_name,
        faktur: data.faktur,
        date: data.date,
        supplier_id: data.supplier_id,
        company_id: data.company_id,
        good_receipt: {
          updateMany: {
            data: {
              is_delete: true,
            },
            where: {
              good_receipt_code_id: data.id,
            },
          },
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
          where: {
            is_delete: false,
          },
          include: {
            product: true,
            product_unit: true,
          },
        },
      },
    });

    return GoodReceiptModel.fromMap(result);
  }

  async updateProductStock() {
    const result = await this.prisma.good_receipt.findMany({
      where: {
        good_receipt_code: {
          is_delete: false,
        },
      },
      include: {
        product_unit: true,
      },
    });

    const response: any[] = [];
    result.forEach((x) => {
      const index = response.findIndex((r) => r.product_id === x.product_id);
      if (index < 0) {
        response.push({
          product_id: x.product_id,
          quantity:
            Number(x.quantity) *
            (x.product_unit == null ? 1 : Number(x.product_unit.conversion)),
        });
      } else {
        response[index].quantity +=
          Number(x.quantity) *
          (x.product_unit == null ? 1 : Number(x.product_unit.conversion));
      }
    });

    return response;
  }

  async delete(id: number, userID: number): Promise<GoodReceiptModel> {
    try {
      const result = await this.prisma.good_receipt_code.update({
        where: {
          id: id,
        },
        data: {
          is_confirm: false,
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

  async deleteGoodReceiptByID(id: number): Promise<void> {
    await this.prisma.good_receipt.delete({
      where: {
        id: id,
      },
    });
  }

  async fetchByName(name: string): Promise<GoodReceiptModel | null> {
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
  }

  async fetchByID(id: number): Promise<GoodReceiptModel | null> {
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
          where: {
            is_delete: false,
          },
        },
        user_good_receipt_code_created_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        user_good_receipt_code_confirmed_byTouser: {
          include: {
            user_avatar: true,
          },
        },
      },
    });

    if (!goodReceipt) {
      return null;
    }

    return GoodReceiptModel.fromMap(goodReceipt);
  }

  async fetchCompanyReport(data: { date: Date; companyID: number }) {
    const result = await this.prisma.good_receipt.findMany({
      where: {
        good_receipt_code: {
          company_id: data.companyID,
          is_delete: false,
          date: data.date,
        },
      },
      include: {
        product: true,
        product_unit: true,
        good_receipt_code: {
          select: {
            name: true,
            supplier: true,
          },
        },
      },
    });

    return result.map((x) => {
      return {
        reference: x.product.reference,
        description: x.product.description,
        quantity: Number(x.quantity),
        unit: x.product_unit == null ? x.product.unit : x.product_unit.unit,
        document: x.good_receipt_code.name,
        opponent: x.good_receipt_code.supplier.name,
      };
    });
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
        { year: number; month: number; count: BigInt }[]
      >`
        SELECT 
          EXTRACT(YEAR FROM date) AS year,
          EXTRACT(MONTH FROM date) AS month,
          COUNT(id) AS count
        FROM good_receipt_code
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
    startDate: Date;
    endDate: Date;
    sortBy: string;
    sortDirection: "asc" | "desc";
    isActive: boolean;
    isDelete: boolean;
    isPending: boolean;
  }) {
    try {
      let formattedIsPending: boolean = data.isPending;
      let formattedIsActive: boolean = data.isActive;
      let formattedIsDelete: boolean = data.isDelete;

      let statusFilter: any[] = [];
      if (!data.isActive && !data.isDelete && !data.isPending) {
        formattedIsActive = true;
        formattedIsPending = true;
        formattedIsDelete = true;
      }

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

      if (formattedIsPending) {
        statusFilter.push({
          AND: [
            {
              is_confirm: false,
            },
            {
              is_delete: false,
            },
          ],
        });
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
      } else if (data.sortBy == "invoice-name") {
        orderBy = {
          invoice_name: data.sortDirection,
        };
      } else if (data.sortBy == "supplier") {
        orderBy = {
          supplier: {
            name: data.sortDirection,
          },
        };
      }

      const [result, count] = await Promise.all([
        this.prisma.good_receipt_code.findMany({
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
                  {
                    supplier: {
                      name: {
                        contains: data.keyword,
                      },
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
          orderBy: orderBy,
        }),
        this.prisma.good_receipt_code.count({
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
                  {
                    supplier: {
                      name: {
                        contains: data.keyword,
                      },
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
      SELECT SUM(value) AS value, SUM(discount) AS discount, COUNT(id) AS count 
      FROM (
        SELECT SUM(gr.value) AS value,
          good_receipt_code.discount,
          good_receipt_code.company_id,
          good_receipt_code.id
        FROM good_receipt_code
        JOIN (
          SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value,
          good_receipt.good_receipt_code_id
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          WHERE good_receipt.good_receipt_code_id IS NOT NULL
          GROUP BY good_receipt.good_receipt_code_id
        ) AS gr ON good_receipt_code.id = gr.good_receipt_code_id
        WHERE good_receipt_code.is_delete = 0
        AND good_receipt_code.date BETWEEN ${DateHelper.convertDate(
          minimumDate,
          formatDate.YYYYMMDD
        )} 
        AND ${DateHelper.convertDate(maximumDate, formatDate.YYYYMMDD)}
        GROUP BY good_receipt_code.id
      ) AS b
      GROUP BY b.company_id
    `;

    if (!result || result.length == 0) {
      return [] as {
        value: number;
        discount: number;
        goodReceiptCount: number;
        company_id: number;
      }[];
    }

    return result.map((x) => {
      return {
        value: Number(x.value),
        discount: Number(x.discount),
        goodReceiptCount: Number(x.count.toString()),
        company_id: Number(x.company_id),
      };
    });
  }

  async fetchChart(month: number, year: number) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, 
      SUM(good_receipt.discount) AS discount, 
      COUNT(good_receipt_code.id) AS goodReceiptCount,
      DAY(good_receipt_code.date) AS date
      FROM good_receipt
      JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
      WHERE good_receipt_code.is_delete = 0
      AND MONTH(good_receipt_code.date) = ${month}
      AND YEAR(good_receipt_code.date) = ${year}
      GROUP BY DAY(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;

    return result.map((x) => {
      return {
        date: Number(x.date),
        value: Number(x.value),
        discount: Number(x.discount),
        goodReceiptCount: Number(x.goodReceiptCount),
      };
    });
  }

  async fetchBestBrand(month: number, year: number): Promise<string | null> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT product_brand.id AS id,
      product_brand.name AS name,
      SUM((good_receipt.price - good_receipt.discount) * good_receipt.quantity) AS value
      FROM good_receipt
      JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
      JOIN product ON good_receipt.product_id = product.id
      JOIN product_brand ON product.product_brand_id = product_brand.id
      WHERE good_receipt_code.is_delete = 0
      AND MONTH(good_receipt_code.date) = ${month}
      AND YEAR(good_receipt_code.date) = ${year}
      GROUP BY product_brand.id
      ORDER BY value DESC
      LIMIT 1
    `;

    if (!result || result.length == 0) {
      return null;
    }

    const data = result[0];
    return data.name;
  }

  async fetchBestType(month: number, year: number): Promise<string | null> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT product_type.id AS id,
      product_type.name AS name,
      SUM((good_receipt.price - good_receipt.discount) * good_receipt.quantity) AS value
      FROM good_receipt
      JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
      JOIN product ON good_receipt.product_id = product.id
      JOIN product_type ON product.product_type_id = product_type.id
      WHERE good_receipt_code.is_delete = 0
      AND MONTH(good_receipt_code.date) = ${month}
      AND YEAR(good_receipt_code.date) = ${year}
      GROUP BY product_type.id
      ORDER BY value DESC
      LIMIT 1
    `;

    if (!result || result.length == 0) {
      return null;
    }

    const data = result[0];
    return data.name;
  }

  async fetchBestSupplier(month: number, year: number) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT supplier.id AS id,
      supplier.name AS name,
      SUM((good_receipt.price - good_receipt.discount) * good_receipt.quantity) AS value
      FROM good_receipt
      JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
      JOIN supplier ON good_receipt_code.supplier_id = supplier.id
      WHERE good_receipt_code.is_delete = 0
      AND MONTH(good_receipt_code.date) = ${month}
      AND YEAR(good_receipt_code.date) = ${year}
      GROUP BY supplier.id
      ORDER BY value DESC
      LIMIT 1
    `;

    if (!result || result.length == 0) {
      return null;
    }

    const data = result[0];
    return data.name;
  }

  async fetchDownload(month: number, year: number) {
    const result = await this.prisma.good_receipt_code.findMany({
      where: {
        AND: [
          {
            date: {
              gte: new Date(year, month - 1, 1),
            },
          },
          {
            date: {
              lt: new Date(year, month, 0),
            },
          },
        ],
        is_delete: false,
      },
      include: {
        good_receipt: {
          where: {
            is_delete: false,
          },
        },
        supplier: true,
      },
    });

    return result.map((x) => {
      return {
        date: x.date,
        name: x.name,
        invoice_name: x.invoice_name,
        faktur: x.faktur,
        supplier_name: x.supplier.name,
        value: x.good_receipt.reduce((a, b) => {
          return (
            a + Number(b.quantity) * (Number(b.price) - Number(b.discount))
          );
        }, 0),
        discount: Number(x.discount),
      };
    });
  }

  async countBySupplierID(supplierID: number) {
    const result = await this.prisma.good_receipt_code.count({
      where: {
        supplier_id: supplierID,
        is_delete: false,
      },
    });

    return result;
  }

  async confirm(data: IGoodReceipt) {
    const [result, ..._] = await this.prisma.$transaction([
      this.prisma.good_receipt_code.update({
        where: {
          id: data.id!,
        },
        data: {
          discount: data.discount,
          name: data.name,
          faktur: data.faktur,
          invoice_name: data.invoice_name,
          confirmed_at: data.confirmed_at,
          confirmed_by: data.confirmed_by,
          is_confirm: data.is_confirm,
          is_delete: data.is_delete,
        },
        include: {
          good_receipt: {
            include: {
              product: true,
              product_unit: true,
            },
            where: {
              is_delete: false,
            },
          },
          user_good_receipt_code_created_byTouser: {
            include: {
              user_avatar: true,
            },
          },
          user_good_receipt_code_confirmed_byTouser: {
            include: {
              user_avatar: true,
            },
          },
        },
      }),
      ...data.good_receipt!.map((x) => {
        return this.prisma.good_receipt.update({
          where: {
            id: x.id,
          },
          data: {
            price: x.price,
            discount: x.discount,
          },
        });
      }),
    ]);

    return GoodReceiptModel.fromMap(result);
  }

  async reject(data: IGoodReceipt) {
    const result = await this.prisma.good_receipt_code.update({
      where: {
        id: data.id,
      },
      data: {
        is_confirm: data.is_confirm,
        is_delete: data.is_delete,
        confirmed_at: data.confirmed_at,
        confirmed_by: data.confirmed_by,
      },
      include: {
        good_receipt: {
          include: {
            product: true,
            product_unit: true,
          },
          where: {
            is_delete: false,
          },
        },
        user_good_receipt_code_created_byTouser: {
          include: {
            user_avatar: true,
          },
        },
        user_good_receipt_code_confirmed_byTouser: {
          include: {
            user_avatar: true,
          },
        },
      },
    });

    return GoodReceiptModel.fromMap(result);
  }

  // Development purposes only
  async createStockIn() {
    return this.prisma.$queryRawUnsafe(`
      INSERT INTO stock_in (product_id, quantity, price, date, residue, company_id, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id) 
        SELECT good_receipt.product_id, good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion), (good_receipt.price - good_receipt.discount),  good_Receipt_code.date, good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion),
        good_receipt_code.company_id, NULL, NULL, good_receipt.id, good_receipt_code.id
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
        WHERE good_receipt_code.is_delete = 0
    `);
  }
}
