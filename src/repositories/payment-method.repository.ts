import { PrismaClient } from "@prisma/client";
import {
  IPaymentMethod,
  PaymentMethodModel,
} from "../model/payment-method.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import { toPositiveInt } from "../helper/sql.helper";

export class PaymentMethodRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IPaymentMethod): Promise<PaymentMethodModel> {
    try {
      const result = await this.prisma.payment_method.create({
        data: {
          name: data.name,
          description: data.description,
          created_at: new Date(),
          created_by: data.created_by!,
        },
      });

      return new PaymentMethodModel({
        ...result,
        can_delete: true,
      });
    } catch (error) {
      throw error;
    }
  }

  async update(data: IPaymentMethod): Promise<PaymentMethodModel> {
    try {
      const result = await this.prisma.payment_method.update({
        where: {
          id: data.id!,
        },
        data: {
          name: data.name,
          description: data.description,
          updated_at: data.created_at,
          updated_by: data.created_by,
        },
      });

      return new PaymentMethodModel({
        ...result,
        can_delete: data.can_delete,
      });
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number, userID: number): Promise<void> {
    try {
      await this.prisma.payment_method.update({
        where: { id: id },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });
    } catch (error) {
      throw error;
    }
  }

  async fetch(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<PaymentMethodModel>> {
    const baseQuery = `
      SELECT payment_method.id, payment_method.name, 
      payment_method.description, 
      IF(COALESCE(countPaymentMethod.count, 0) = 0, "1", "0") AS can_delete
      FROM payment_method
      LEFT JOIN (
        SELECT COUNT(sales_invoice_payment.id) AS count, sales_invoice_payment.payment_method_id
        FROM sales_invoice_payment
        JOIN sales_invoice_code ON sales_invoice_payment.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        GROUP BY payment_method_id
      ) countPaymentMethod ON countPaymentMethod.payment_method_id = payment_method.id
      WHERE payment_method.is_delete = 0
    `;

    const params: any[] = [];
    let keywordCondition = "";
    if (data.keyword) {
      keywordCondition = `AND (payment_method.name LIKE ? OR payment_method.description LIKE ?)`;
      params.push(`%${data.keyword}%`, `%${data.keyword}%`);
    }

    const limit = toPositiveInt(data.pageSize, 10);
    const offset = toPositiveInt(data.page, 1) * limit - limit;

    const query = `
      ${baseQuery}
      ${keywordCondition}
      ORDER BY payment_method.name ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countCondition = data.keyword
      ? {
          is_delete: false,
          OR: [
            { name: { contains: data.keyword } },
            { description: { contains: data.keyword } },
          ],
        }
      : { is_delete: false };

    const [result, count] = await this.prisma.$transaction([
      this.prisma.$queryRawUnsafe<any[]>(query, ...params),
      this.prisma.payment_method.count({ where: countCondition }),
    ]);

    return {
      data: result.map(
        (item: any) =>
          new PaymentMethodModel({
            id: item.id,
            name: item.name,
            description: item.description,
            can_delete: item.can_delete,
          })
      ),
      count: count,
    };
  }

  async fetchAutocomplete(keyword: string): Promise<PaymentMethodModel[]> {
    try {
      const result = await this.prisma.payment_method.findMany({
        where: {
          is_delete: false,
          ...(keyword && {
            OR: [
              { name: { contains: keyword } },
              { description: { contains: keyword } },
            ],
          }),
        },
        orderBy: { name: "asc" },
        take: 5,
      });

      return result.map(
        (item) =>
          new PaymentMethodModel({
            id: item.id,
            name: item.name,
            description: item.description,
            can_delete: true, // Assuming all fetched methods can be deleted
          })
      );
    } catch (error) {
      throw error;
    }
  }

  async fetchByID(id: number): Promise<PaymentMethodModel | null> {
    try {
      const result = await this.prisma.payment_method.findUnique({
        where: {
          id: id,
        },
        select: {
          name: true,
          description: true,
          id: true,
          is_delete: true,
        },
      });

      if (!result) {
        return null;
      }

      return new PaymentMethodModel({
        id: result.id,
        name: result.name,
        description: result.description,
        is_delete: result.is_delete,
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchAll(): Promise<PaymentMethodModel[]> {
    try {
      const result = await this.prisma.payment_method.findMany({
        where: {
          is_delete: false,
        },
        select: {
          name: true,
          description: true,
          id: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return result.map(
        (item) =>
          new PaymentMethodModel({
            id: item.id,
            name: item.name,
            description: item.description,
            can_delete: true, // Assuming all fetched methods can be deleted
          })
      );
    } catch (error) {
      throw error;
    }
  }
}
