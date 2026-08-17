import { Prisma, PrismaClient } from "@prisma/client";
import { SalesInvoiceModel } from "../models/sales-invoice.model";
import { ISalesInvoiceCode } from "../interfaces/sales-invoice.interface";
import { IFetchAnnualArchives } from "../interfaces/fetch.interface";

import { DateHelper, formatDate } from "../utils/date.helper";
import { IFetchArchiveResult } from "../interfaces/archive.interface";
import ErrorList from "../constants/error-list.constant";

export class SalesInvoiceRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /*
    tx diisi ketika pemanggilnya sudah berada di dalam transaksi interaktif,
    sehingga tulisan di sini ikut dibatalkan bila langkah berikutnya gagal.
    Tanpa tx, perilakunya persis seperti sebelumnya.
  */
  async create(
    data: ISalesInvoiceCode,
    tx?: Prisma.TransactionClient
  ): Promise<SalesInvoiceModel> {
    const db = tx ?? this.prisma;
    const result = await db.sales_invoice_code.create({
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
  }

  async updateProductStock() {
    const result = await this.prisma.sales_invoice.findMany({
      where: {
        sales_invoice_code: {
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
        confirmed_at: new Date(),
        confirmed_by: userID,
      },
    });

    if (!result) {
      throw new Error(ErrorList["Sales invoice not found"]);
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

  /**
   * Jumlah pelanggan BERBEDA yang berbelanja pada satu bulan, untuk kartu
   * pelanggan di laporan penjualan. Penjualan eceran (customer_id null)
   * tidak dihitung — ia bukan satu pelanggan.
   */
  async fetchCustomerCount(month: number, year: number): Promise<number> {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
        SELECT COUNT(DISTINCT customer_id) AS count
        FROM sales_invoice_code
        WHERE is_delete = false
          AND customer_id IS NOT NULL
          AND MONTH(date) = ${month}
          AND YEAR(date) = ${year}
      `;

      return Number(result[0]?.count ?? 0);
    } catch (error) {
      console.error(`[error]: Error on fetching customer count ${error}`);
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
  }

  async fetchChart(month: number, year: number) {
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

  async fetchBrandSales(data: {
    month: number;
    year: number;
  }): Promise<{ name: string; id: number; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value,
        product_brand.name, product.product_brand_id
        FROM sales_invoice
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        JOIN product ON sales_invoice.product_id = product.id
        JOIN product_brand ON product.product_brand_id = product_brand.id
        WHERE MONTH(sales_invoice_code.date) = ${data.month + 1}
        AND YEAR(sales_invoice_code.date) = ${data.year}
        AND sales_invoice_code.is_delete = 0
        GROUP BY product.product_brand_id
      `;

    return result
      .map((x) => {
        return {
          name: x.name,
          id: Number(x.product_brand_id),
          value: Number(x.value),
        };
      })
      .sort((a, b) => {
        return b.value - a.value;
      });
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

  async fetchTypeSales(data: {
    month: number;
    year: number;
  }): Promise<{ name: string; id: number; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value,
        product_type.name, product.product_type_id
        FROM sales_invoice
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        JOIN product ON sales_invoice.product_id = product.id
        JOIN product_type ON product.product_type_id = product_type.id
        WHERE MONTH(sales_invoice_code.date) = ${data.month + 1}
        AND YEAR(sales_invoice_code.date) = ${data.year}
        AND sales_invoice_code.is_delete = 0
        GROUP BY product.product_type_id
      `;

    return result
      .map((x) => {
        return {
          name: x.name,
          id: Number(x.product_brand_id),
          value: Number(x.value),
        };
      })
      .sort((a, b) => {
        return b.value - a.value;
      });
  }

  async fetchSalesSales(data: {
    month: number;
    year: number;
  }): Promise<{ sales: string; value: number }[]> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value,
        sales_invoice_code.sales
        FROM sales_invoice
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE MONTH(sales_invoice_code.date) = ${data.month + 1}
        AND YEAR(sales_invoice_code.date) = ${data.year}
        AND sales_invoice_code.is_delete = 0
        GROUP BY sales_invoice_code.sales
      `;

    return result
      .map((x) => {
        return {
          sales: x.sales,
          value: Number(x.value),
        };
      })
      .sort((a, b) => {
        return b.value - a.value;
      });
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

  async fetchDownload(month: number, year: number): Promise<any> {
    const result = await this.prisma.sales_invoice_code.findMany({
      where: {
        AND: [
          {
            date: {
              lte: new Date(year, month, 0),
            },
          },
          {
            date: {
              gte: new Date(year, month - 1, 1),
            },
          },
        ],
        is_delete: false,
      },
      include: {
        sales_invoice: true,
        customer: true,
      },
    });

    return result.map((x) => {
      return {
        date: x.date,
        sales: x.sales,
        customer_name: x.customer == null ? "Retail" : x.customer.name,
        name: x.name,
        delivery: Number(x.delivery),
        discount: Number(x.discount),
        service: Number(x.service),
        value: x.sales_invoice.reduce((a, b) => {
          return (
            a + Number(b.quantity) * (Number(b.price) - Number(b.discount))
          );
        }, 0),
      };
    });
  }

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
    startDate: Date;
    endDate: Date;
  }): Promise<IFetchArchiveResult<SalesInvoiceModel>> {
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
            is_delete: false,
          },
          {
            is_delete: true,
          },
        ],
      };
    } else if (data.isActive) {
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
      this.prisma.sales_invoice_code.findMany({
        where: {
          AND: [
            {
              date: {
                gte: new Date(data.year, data.month - 1, 1),
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
            paymentFilter,
            statusFilter,
          ],
        },
        orderBy: orderBy,
        include: {
          customer: true,
          /*
            Barisnya diambil semata untuk menghitung total — daftar arsip
            menampilkannya sebagai satu kolom. Hanya tiga kolom yang ditarik,
            bukan seluruh baris beserta produknya, karena selebihnya tidak
            dipakai dan jumlah barisnya bisa banyak.
          */
          sales_invoice: {
            select: {
              quantity: true,
              price: true,
              discount: true,
            },
          },
        },
        take: data.limit,
        skip: data.offset,
      }),
      this.prisma.sales_invoice_code.count({
        where: {
          AND: [
            {
              date: {
                gte: new Date(data.year, data.month - 1, 1),
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

  async fetchSales(): Promise<string[]> {
    const sales = await this.prisma.sales_invoice_code.groupBy({
      by: ["sales"],
      where: {
        sales: {
          not: null,
        },
      },
    });

    return sales.map((x) => x.sales).filter((x): x is string => x != null);
  }
}
