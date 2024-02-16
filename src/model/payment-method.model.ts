import { PrismaClient } from "@prisma/client";
import { fetchMode } from "../interface/fetch.interface";

const prisma = new PrismaClient();

export interface IPaymentMethod {
  id?: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  can_delete?: boolean;
}

export interface IPaymentMethodManual {
  id: number;
  name: string;
  description: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  can_delete: string;
}

class PaymentMethodModel {
  /**
   * Create payment method
   * @param data
   * @returns
   */
  static create(data: IPaymentMethod) {
    return prisma.payment_method.create({
      data: {
        name: data.name,
        description: data.description,
        created_at: new Date(),
        created_by: data.created_by,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update payment method
   * @param data
   */
  static update(data: IPaymentMethod) {
    return prisma.payment_method.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        description: data.description,
        updated_at: new Date(),
        updated_by: data.created_by,
      },
      include: {
        user_payment_method_updated_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Fetch payment method
   * @param keyword
   * @param offset
   * @param limit
   * @param mode
   */
  static fetch(
    keyword: string,
    offset: number,
    limit: number,
    mode: fetchMode
  ) {
    if (mode == fetchMode.All) {
      return prisma.payment_method.findMany({
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
    } else if (mode == fetchMode.Autocomplete) {
      if (keyword == "") {
        return prisma.payment_method.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
        });
      } else {
        return prisma.payment_method.findMany({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                description: {
                  contains: keyword,
                },
              },
            ],
          },
          orderBy: {
            name: "asc",
          },
          take: 5,
          skip: 0,
        });
      }
    } else if (mode == fetchMode.Pagination) {
      if (keyword == "") {
        return prisma.$transaction([
          prisma.$queryRaw<IPaymentMethod[]>`
            SELECT payment_method.id, payment_method.name, 
            payment_method.description, 
            IF(COALESCE(countPaymentMethod.count, 0) = 0, "1", "0") AS can_delete
            FROM payment_method
            LEFT JOIN (
              SELECT COUNT(bill_payment.id) AS count, bill_payment.payment_method_id
              FROM bill_payment
              JOIN bill_code ON bill_payment.bill_code_id = bill_code.id
              WHERE bill_code.is_delete = 0
              group by payment_method_id
            ) countPaymentMethod 
            ON countPaymentMethod.payment_method_id = payment_method.id
            WHERE payment_method.is_delete = 0
            order by payment_method.name asc
            limit ${limit} 
            offset ${offset}
          `,
          prisma.payment_method.count({
            where: {
              is_delete: false,
            },
          }),
        ]);
      } else {
        return prisma.$transaction([
          prisma.$queryRawUnsafe<IPaymentMethodManual[]>(`
            SELECT payment_method.id, payment_method.name, 
            payment_method.description, 
            IF(COALESCE(countPaymentMethod.count, 0) = 0, TRUE, FALSE) AS can_delete
            FROM payment_method
            LEFT JOIN (
              SELECT COUNT(bill_payment.id) AS count, bill_payment.payment_method_id
              FROM bill_payment
              JOIN bill_code ON bill_payment.bill_code_id = bill_code.id
              WHERE bill_code.is_delete = 0
              group by payment_method_id
            ) countPaymentMethod ON countPaymentMethod.payment_method_id = payment_method.id
            WHERE payment_method.is_delete = 0
            AND (payment_method.name LIKE '%${keyword}%' OR payment_method.description LIKE '%${keyword}%')
            order by payment_method.name asc
            limit ${limit} 
            offset ${offset}
          `),
          prisma.payment_method.count({
            where: {
              is_delete: false,
              OR: [
                {
                  name: {
                    contains: keyword,
                  },
                },
                {
                  description: {
                    contains: keyword,
                  },
                },
              ],
            },
          }),
        ]);
      }
    }
  }

  static fetchByID(id: number) {
    return prisma.$queryRaw<IPaymentMethodManual[]>`
      SELECT payment_method.id, payment_method.name, 
      payment_method.description, 
      IF(COALESCE(countPaymentMethod.count, 0) = 0, "1", "0") AS can_delete
      FROM payment_method
      LEFT JOIN (
        SELECT COUNT(bill_payment.id) AS count, bill_payment.payment_method_id
        FROM bill_payment
        JOIN bill_code ON bill_payment.bill_code_id = bill_code.id
        WHERE bill_code.is_delete = 0
        group by payment_method_id
      ) countPaymentMethod ON countPaymentMethod.payment_method_id = payment_method.id
      WHERE payment_method.id = ${id}
    `;
  }

  static delete(id: number, created_by: number) {
    return prisma.payment_method.update({
      where: {
        id: id,
      },
      data: {
        deleted_at: new Date(),
        deleted_by: created_by,
        is_delete: true,
      },
      include: {
        user_payment_method_deleted_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}

export default PaymentMethodModel;
