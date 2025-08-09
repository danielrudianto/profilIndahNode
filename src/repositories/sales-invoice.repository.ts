import { PrismaClient } from "@prisma/client";
import {
  ISalesInvoiceCode,
  SalesInvoiceModel,
} from "../model/sales-invoice.model";
import {
  IFetchAnnualArchives,
  IFetchCommonResult,
} from "../interface/fetch.interface";
import { DateHelper, formatDate } from "../helper/date.helper";
import { IFetchArchiveResult } from "../interface/archive.interface";

export class SalesInvoiceRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: ISalesInvoiceCode): Promise<SalesInvoiceModel> {
    try {
      const result = await this.prisma.sales_invoice_code.create({
        data: {
          uuid: data.uuid,
          name: data.name,
          created_by: data.createdBy,
          created_at: data.createdAt,
          customer_id: data.customerID,
          discount: data.discount,
          delivery: data.delivery,
          service: data.service,
          date: data.date,
          is_confirm: data.isConfirm,
          confirmed_by: data.confirmedBy,
          confirmed_at: data.confirmedAt,
          sales_invoice: {
            createMany: {
              data: data.sales_invoice!,
            },
          },
          sales_invoice_payment: {
            createMany: {
              data: data.sales_invoice_payment!.map((x) => {
                return {
                  date: x.date,
                  value: x.value,
                  payment_method_id: x.payment_method_id,
                };
              }),
            },
          },
          is_paid: data.isPaid,
          sales: data.sales,
        },
        include: {
          sales_invoice: {
            include: {
              product_unit: true,
            },
          },
          sales_invoice_payment: {
            include: {
              payment_method: true,
            },
          },
        },
      });

      return SalesInvoiceModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  generateName(date: Date): string {
    return `INV-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;
  }

  async deleteByID(id: number, userID: number): Promise<SalesInvoiceModel> {
    const result = await this.prisma.sales_invoice_code.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        is_confirm: false,
      },
    });

    if (!result) {
      throw new Error("Sales invoice not found or already deleted");
    }

    return SalesInvoiceModel.fromMap(result);
  }

  async fetchByID(id: number): Promise<SalesInvoiceModel | null> {
    try {
      const salesInvoice = await this.prisma.sales_invoice_code.findUnique({
        where: {
          id: id,
        },
        include: {
          sales_invoice: {
            include: {
              product: true,
              product_unit: true,
            },
          },
          sales_invoice_payment: {
            include: {
              payment_method: true,
            },
          },
          customer: true,
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

      if (!salesInvoice) {
        return null;
      }

      const result = SalesInvoiceModel.fromMap(salesInvoice);
      return result;
    } catch (error) {
      console.error(
        `[error]: Error on fetching sales invoice by ID ${id}: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<{
    value: number;
    discount: number;
    delivery: number;
    service: number;
    salesInvoiceCount: number;
    customerCount: number;
  }> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value, 
        SUM(sales_invoice_code.discount) AS discount, 
        SUM(sales_invoice_code.service) AS service, 
        SUM(sales_invoice_code.delivery) AS delivery,
        COUNT(sales_invoice_code.id) AS salesInvoiceCount,
        COUNT(DISTINCT(sales_invoice_code.customer_id)) AS customerCount
        FROM sales_invoice
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        AND sales_invoice_code.date BETWEEN ${DateHelper.convertDate(
          startDate,
          formatDate.YYYYMMDD
        )}
        AND ${DateHelper.convertDate(endDate, formatDate.YYYYMMDD)};
    `;

      if (!result || result.length == 0) {
        return {
          value: 0,
          delivery: 0,
          discount: 0,
          service: 0,
          salesInvoiceCount: 0,
          customerCount: 0,
        };
      }

      const data = result[0];
      return {
        value: Number(data.value),
        delivery: Number(data.delivery),
        discount: Number(data.discount),
        service: Number(data.service),
        salesInvoiceCount: Number(data.salesInvoiceCount),
        customerCount: Number(data.customerCount),
      };
    } catch (error) {
      throw error;
    }
  }

  async fetchChart(month: number, year: number) {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
      SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value, 
      SUM(sales_invoice_code.discount) AS discount, 
      SUM(sales_invoice_code.service) AS service, 
      SUM(sales_invoice_code.delivery) AS delivery,
      COUNT(sales_invoice_code.id) AS salesInvoiceCount,
      DAY(sales_invoice_code.date) AS date
      FROM sales_invoice
      JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
      WHERE sales_invoice_code.is_delete = 0
      AND MONTH(sales_invoice_code.date) = ${month}
      AND YEAR(sales_invoice_code.date) = ${year}
      GROUP BY DAY(sales_invoice_code.date)
    `;

      return result.map((x) => {
        return {
          date: Number(x.date),
          value: Number(x.value),
          discount: Number(x.discount),
          delivery: Number(x.delivery),
          service: Number(x.service),
          salesInvoiceCount: Number(x.salesInvoiceCount),
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchBestBrand(month: number, year: number): Promise<string | null> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT product_brand.id AS id,
      product_brand.name AS name,
      SUM((sales_invoice.price - sales_invoice.discount) * sales_invoice.quantity) AS value
      FROM sales_invoice
      JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
      JOIN product ON sales_invoice.product_id = product.id
      JOIN product_brand ON product.product_brand_id = product_brand.id
      WHERE sales_invoice_code.is_delete = 0
      AND MONTH(sales_invoice_code.date) = ${month}
      AND YEAR(sales_invoice_code.date) = ${year}
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
      SUM((sales_invoice.price - sales_invoice.discount) * sales_invoice.quantity) AS value
      FROM sales_invoice
      JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
      JOIN product ON sales_invoice.product_id = product.id
      JOIN product_type ON product.product_type_id = product_type.id
      WHERE sales_invoice_code.is_delete = 0
      AND MONTH(sales_invoice_code.date) = ${month}
      AND YEAR(sales_invoice_code.date) = ${year}
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

  async fetchBestSales(month: number, year: number) {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT sales_invoice_code.sales,
      SUM((sales_invoice.price - sales_invoice.discount) * sales_invoice.quantity) AS value
      FROM sales_invoice
      JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
      WHERE sales_invoice_code.is_delete = 0
      AND MONTH(sales_invoice_code.date) = ${month}
      AND YEAR(sales_invoice_code.date) = ${year}
      AND sales_invoice_code.sales IS NOT NULL
      GROUP BY sales_invoice_code.sales
      ORDER BY value DESC
      LIMIT 1
    `;

    if (!result || result.length == 0) {
      return null;
    }

    const data = result[0];
    return data.sales;
  }

  async fetchDownload(month: number, year: number): Promise<any> {}

  async searchByReturns(
    date: Date,
    sales_invoice: {
      product_id: number;
      product_unit_id: number | null;
      quantity: number;
    }[]
  ) {
    const productConditions = sales_invoice.map((item) => ({
      product_id: item.product_id,
      product_unit_id: item.product_unit_id,
      quantity: {
        gte: item.quantity,
      },
    }));

    try {
      const result = await this.prisma.sales_invoice.findMany({
        where: {
          OR: productConditions,
          sales_invoice_code: {
            is_delete: false,
            date: date,
          },
        },
        distinct: ["sales_invoice_code_id"],
      });

      const sales_invoices = await this.prisma.sales_invoice_code.findMany({
        where: {
          id: {
            in: result.map((x) => {
              return x.sales_invoice_code_id;
            }),
          },
        },
        include: {
          sales_invoice: {
            include: {
              product: true,
              product_unit: true,
            },
          },
          sales_invoice_payment: {
            include: {
              payment_method: true,
            },
          },
          customer: true,
        },
      });

      return sales_invoices.map((x) => {
        return SalesInvoiceModel.fromMap(x);
      });
    } catch (error) {
      console.error(`[error]: Error on fetching sales invoice ${error}`);
      throw error;
    }
  }

  async search(
    filterObject: any,
    keyword: string,
    page: number,
    pageSize: number
  ): Promise<IFetchCommonResult<SalesInvoiceModel>> {
    // filterObject has several keys
    // 1. dateStart: Date | null
    // 2. dateEnd : Date | null
    // 3. CustomerID: number[]
    // 4. Status
    // Fist, I need to filter if dateStart or dateEnd is not null
    const where: any = {};

    if (filterObject.dateStart) {
      where.date = {
        gte: filterObject.dateStart,
      };
    }

    if (filterObject.dateEnd) {
      where.date = {
        ...where.date,
        lte: filterObject.dateEnd,
      };
    }

    if (filterObject.customerID.length > 0) {
      where.customer_id = {
        in: filterObject.customerID,
      };
    }

    // if status == 0, then isDelete = 0
    // if status == 1, then isDelete = 1
    // if status == 2, then isDelete = 0 || isDelete = 1
    if (filterObject.status === 0) {
      where.is_delete = false;
    } else if (filterObject.status === 1) {
      where.is_delete = true;
    }

    // if keyword is not empty, then search by name or customer name
    if (keyword) {
      where.OR = [
        {
          name: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        {
          customer: {
            name: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
        {
          sales: {
            name: {
              contains: keyword,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [result, count] = await Promise.all([
      this.prisma.sales_invoice_code.findMany({
        where: {
          ...where,
        },
        include: {
          customer: true,
        },
        orderBy: {
          date: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),

      this.prisma.sales_invoice_code.count({
        where: {
          ...where,
        },
      }),
      this.prisma.sales_invoice_code.count({
        where: {
          ...where,
        },
      }),
    ]);

    return {
      data: result.map((x) => SalesInvoiceModel.fromMap(x)),
      count: count,
    };
  }

  async checkSalesReturn(
    data: { quantity: number; bill_id: number }[]
  ): Promise<boolean> {
    try {
      const result = await this.prisma.sales_invoice.findMany({
        where: {
          id: {
            in: data.map((x) => x.bill_id),
          },
        },
        select: {
          id: true,
          quantity: true,
        },
      });

      for (let billData of data) {
        // if the bill is not found, return false
        const bill = result.find((x) => x.id === billData.bill_id);
        if (!bill) {
          return false;
        }

        // if the quantity is less than the bill quantity, return false
        if (billData.quantity < Number(bill.quantity)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`[error]: Error on checking sales return ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchSalesStatistics(userID: number): Promise<number> {
    try {
      const result = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, SUM(bill_code.discount) AS discount, SUM(bill_code.delivery) AS delivery, SUM(bill_code.service) AS service
        FROM bill
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND bill_code.created_by = ${userID}
      `);

      if (result.length === 0 || !result[0]) {
        return 0;
      }

      const data = result[0];
      const value = Number(data.value) || 0;
      const discount = Number(data.discount) || 0;
      const service = Number(data.service) || 0;
      const delivery = Number(data.delivery) || 0;

      return value - discount + service + delivery;
    } catch (error) {
      console.error(
        `[error]: Error on fetching sales by user ID ${userID}: ${error}`
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
        FROM sales_invoice_code
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
    limit: number;
    offset: number;
    keyword: string;
    isPaid: boolean;
    isUnpaid: boolean;
    isActive: boolean;
    isDelete: boolean;
    sortBy: string;
    sortDirection: "asc" | "desc";
  }): Promise<IFetchArchiveResult<SalesInvoiceModel>> {
    try {
      let paymentFilter: any = {};
      if ((!data.isPaid && !data.isUnpaid) || (data.isPaid && data.isUnpaid)) {
        paymentFilter = {
          OR: [
            {
              is_paid: true,
            },
            {
              is_paid: false,
            },
          ],
        };
      } else if (data.isPaid) {
        paymentFilter = {
          is_paid: true,
        };
      } else {
        paymentFilter = {
          is_paid: false,
        };
      }

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
        this.prisma.sales_invoice_code.findMany({
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
              paymentFilter,
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
        this.prisma.sales_invoice_code.count({
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
              paymentFilter,
              statusFilter,
            ],
          },
        }),
      ]);

      return {
        data: result.map((x) => {
          return SalesInvoiceModel.fromMap(x);
        }),
        count: count,
      };
    } catch (error) {
      throw error;
    }
  }

  async validateSalesReturn(
    sales_return_items: { sales_invoice_id: number; quantity: number }[]
  ): Promise<boolean> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        COALESCE(SUM(sales_return.quantity), 0) AS returned,
        sales_invoice.quantity,
        sales_invoice.id
      FROM sales_invoice
      LEFT JOIN sales_return ON sales_return.sales_invoice_id = sales_invoice.id
      LEFT JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id 
      AND sales_return_code.is_delete = 0
      WHERE sales_invoice.id IN (${sales_return_items
        .map((x) => x.sales_invoice_id)
        .join(",")})
      GROUP BY sales_invoice.id
    `;

    return (
      result.filter((x) => {
        const quantity = Number(x.quantity);
        const returned = Number(x.returned);
        const sales_invoice_id = Number(x.id);
        const returnIndex = sales_return_items.findIndex(
          (y) => y.sales_invoice_id == sales_invoice_id
        );
        const returnQuantity =
          returnIndex == -1 ? 0 : sales_return_items[returnIndex].quantity;
        return quantity < returned + returnQuantity;
      }).length == 0
    );
  }
}
