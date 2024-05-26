import { PrismaClient } from "@prisma/client";
import ErrorList from "../assets/error_list";
import { fetchMode } from "../interface/fetch.interface";

const prisma = new PrismaClient();

export interface ICustomer {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  pic: string;
  phone_number: string;
  created_by: number;
  is_delete?: boolean;
  can_delete?: boolean;
}

export interface ICustomerResponse {
  data: ICustomer[];
  count: number;
}

class CustomerModel {
  static create(data: ICustomer) {
    return prisma.customer.create({
      data: {
        name: data.name,
        address: data.address,
        npwp: data.npwp,
        pic: data.pic,
        phone_number: data.phone_number,
        created_by: data.created_by,
        created_at: new Date(),
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

  static update(data: ICustomer) {
    return prisma.customer.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        address: data.address,
        npwp: data.npwp,
        pic: data.pic,
        phone_number: data.phone_number,
        updated_by: data.created_by,
        updated_at: new Date(),
      },
      include: {
        user_customer_updated_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static delete(id: number, created_by: number) {
    return prisma.customer.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
      },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
        user_customer_deleted_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  static async fetch(
    keyword: string,
    offset: number,
    limit: number,
    mode: fetchMode
  ) {
    if (mode == fetchMode.Pagination) {
      const result = await prisma.$transaction([
        prisma.$queryRawUnsafe<ICustomer[]>(`
          SELECT customer.id, customer.name, customer.address, 
          customer.pic, customer.npwp, customer.phone_number, 
          customer.created_at, customer.is_delete,
          IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
          FROM customer
          LEFT JOIN (
            SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
            FROM bill_code
            WHERE bill_code.is_delete = 0
            GROUP BY bill_code.customer_id
          ) itemCount
          ON customer.id = itemCount.customer_id
          WHERE customer.is_delete = 0
          AND (
            customer.name LIKE '%${keyword}%'
            OR customer.address LIKE '%${keyword}%'
            OR customer.npwp LIKE '%${keyword}%'
            OR customer.pic LIKE '%${keyword}%'
            OR customer.phone_number LIKE '%${keyword}%'
          )
          ORDER BY customer.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
        prisma.customer.count({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                address: {
                  contains: keyword,
                },
              },
              {
                npwp: {
                  contains: keyword,
                },
              },
              {
                pic: {
                  contains: keyword,
                },
              },
              {
                phone_number: {
                  contains: keyword,
                },
              },
            ],
          },
        }),
      ]);

      if (!result[0]) {
        throw Error(ErrorList["Not found"]);
      }

      return {
        data: result[0].map((x: any) => {
          return {
            ...x,
            can_delete: x.can_delete == "1" ? true : false,
          };
        }),
        count: result[1],
      };
    } else if (mode == fetchMode.Autocomplete) {
      return prisma.customer.findMany({
        where: {
          is_delete: false,
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              address: {
                contains: keyword,
              },
            },
            {
              npwp: {
                contains: keyword,
              },
            },
            {
              pic: {
                contains: keyword,
              },
            },
            {
              phone_number: {
                contains: keyword,
              },
            },
          ],
        },
        orderBy: {
          name: "asc",
        },
        take: limit,
        skip: offset,
      });
    } else if (mode == fetchMode.All) {
      return prisma.customer.findMany({
        where: {
          is_delete: false,
        },
      });
    }
  }

  /**
   * Fetch customer by ID
   * @param id
   * @returns
   */
  static async fetchByID(id: number): Promise<ICustomer> {
    const customers = await prisma.$queryRaw<any[]>`
      SELECT customer.id, customer.name, customer.address, 
      customer.pic, customer.npwp, customer.phone_number, 
      IF(COALESCE(itemCount.count, 0) = 0, '1', '0') AS can_delete
      FROM customer
      LEFT JOIN (
        SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
        FROM bill_code
        WHERE bill_code.is_delete = 0
        AND bill_code.customer_id = ${id}
      ) itemCount
      ON customer.id = itemCount.customer_id
      WHERE customer.id = ${id}
    `;

    if (!customers) {
      throw Error(ErrorList["Not found"]);
    }

    if (customers.length == 0) {
      throw Error(ErrorList["Not found"]);
    }

    return {
      ...customers[0],
      can_delete: customers[0].can_delete == "1" ? true : false,
    };
  }

  /**
   * Fetch customer by IDs
   * @param id
   * @returns
   */
  static async fetchByIDs(ids: number[]) {
    if (ids.length == 0) return Promise.resolve([]);

    return prisma.$queryRawUnsafe(`
      SELECT customer.id, IF(COALESCE(itemCount.count, 0) = 0, '1', '0') AS can_delete
      FROM customer
      LEFT JOIN (
        SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
        FROM bill_code
        WHERE bill_code.is_delete = 0
      ) itemCount
      ON customer.id = itemCount.customer_id
      WHERE customer.id IN (${ids.join(",")})
    `);
  }

  static fetchBySales(id: number) {
    return prisma.customer.count({
      where: {
        is_delete: false,
        created_by: id,
      },
    });
  }
}

export default CustomerModel;
