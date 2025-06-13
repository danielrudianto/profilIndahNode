import { PrismaClient } from "@prisma/client";
import {
  ISalesInvoiceCode,
  SalesInvoiceModel,
} from "../model/sales-invoice.model";
import { IFetchCommonResult } from "../interface/fetch.interface";

export class SalesInvoiceRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: ISalesInvoiceCode): Promise<SalesInvoiceModel> {
    try {
      const result = await this.prisma.bill_code.create({
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
          bill: {
            createMany: {
              data: data.bill!,
            },
          },
          bill_payment: {
            createMany: {
              data: data.bill_payment!.map((x) => {
                return {
                  date: x.date,
                  value: x.value,
                  payment_method_id:
                    x.payment_method_id == 0 ? null : x.payment_method_id,
                };
              }),
            },
          },
          payment_term: data.paymentTerm,
          is_paid: data.isPaid,
          sales: data.sales,
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

  async fetchByID(id: number): Promise<SalesInvoiceModel> {
    try {
      const salesInvoice = await this.prisma.bill_code.findUnique({
        where: {
          id: id,
        },
        include: {
          bill: {
            select: {
              id: true,
              item_id: true,
              item_unit_id: true,
              quantity: true,
              price: true,
              discount: true,
              item: {
                select: {
                  reference: true,
                  description: true,
                  unit: true,
                  item_brand_id: true,
                  item_type_id: true,
                },
              },
              item_unit: {
                select: {
                  unit: true,
                  conversion: true,
                },
              },
            },
          },
          bill_payment: {
            select: {
              id: true,
              date: true,
              value: true,
              payment_method_id: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!salesInvoice) {
        throw new Error(`Sales invoice with ID ${id} not found`);
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
      this.prisma.bill_code.findMany({
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

      this.prisma.bill_code.count({
        where: {
          ...where,
        },
      }),
      this.prisma.bill_code.count({
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
      const result = await this.prisma.bill.findMany({
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
}
