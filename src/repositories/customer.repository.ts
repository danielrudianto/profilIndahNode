import { PrismaClient } from "@prisma/client";
import { CustomerModel, ICustomer } from "../model/customer.model";
import { UserViewModel } from "../model/user.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";

export class CustomerRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: ICustomer): Promise<CustomerModel> {
    try {
      const result = await this.prisma.customer.create({
        data: {
          name: data.name,
          address: data.address,
          npwp: data.npwp,
          pic: data.pic,
          phone_number: data.phone_number,
          created_by: data.created_by!,
          created_at: data.created_at,
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return new CustomerModel({
        name: result.name,
        address: result.address,
        npwp: result.npwp,
        pic: result.pic,
        phone_number: result.phone_number,
        created_by: result.created_by,
        created_at: result.created_at,
        id: result.id,
        user: UserViewModel.fromMap(result.user),
      });
    } catch (error) {
      console.error(`[error]: Error on creating customer: ${error}`);
      throw error;
    }
  }

  async update(data: ICustomer): Promise<CustomerModel> {
    try {
      const result = await this.prisma.customer.update({
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
          updated_at: data.created_at,
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return new CustomerModel({
        id: result.id,
        name: result.name,
        address: result.address,
        npwp: result.npwp,
        pic: result.pic,
        phone_number: result.phone_number,
        created_by: result.created_by,
        created_at: result.created_at,
        user: UserViewModel.fromMap(result.user),
      });
    } catch (error) {
      console.error(`[error]: Error on updating customer: ${error}`);
      throw error;
    }
  }

  async delete(id: number, userID: number): Promise<CustomerModel> {
    try {
      const result = await this.prisma.customer.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return new CustomerModel({
        id: result.id,
        name: result.name,
        address: result.address,
        npwp: result.npwp,
        pic: result.pic,
        phone_number: result.phone_number,
        created_by: result.created_by,
        created_at: result.created_at,
        user: UserViewModel.fromMap(result.user),
      });
    } catch (error) {
      console.error(`[error]: Error on deleting customer: ${error}`);
      throw error;
    }
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<CustomerModel>> {
    const { keyword, pageSize, page } = data;

    // SQL query for fetching customers
    const customerQuery = `
      SELECT
          c.id,
          c.name,
          c.address,
          c.pic,
          c.npwp,
          c.phone_number,
          c.created_at,
          c.is_delete,
          c.created_by,
          IF(COUNT(bc.id) = 0, "1", "0") AS can_delete
      FROM
          customer c
      LEFT JOIN
          sales_invoice_code bc ON c.id = bc.customer_id AND bc.is_delete = 0
      WHERE
          c.is_delete = 0
          AND (
              c.name LIKE '%${keyword}%'
              OR c.address LIKE '%${keyword}%'
              OR c.npwp LIKE '%${keyword}%'
              OR c.pic LIKE '%${keyword}%'
              OR c.phone_number LIKE '%${keyword}%'
          )
      GROUP BY c.id, c.name, c.address, c.pic, c.npwp, c.phone_number, c.created_at, c.is_delete, c.created_by  -- Group by all non-aggregated columns
      ORDER BY
          c.name ASC
      LIMIT ${pageSize}
      OFFSET ${(page - 1) * pageSize}
    `;

    // Prisma count query
    const countQuery = {
      where: {
        is_delete: false,
        OR: [
          { name: { contains: keyword } },
          { address: { contains: keyword } },
          { npwp: { contains: keyword } },
          { pic: { contains: keyword } },
          { phone_number: { contains: keyword } },
        ],
      },
    };

    // Execute queries in a transaction
    try {
      const startTime = Date.now();
      const [result, count] = await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<any[]>(customerQuery),
        this.prisma.customer.count(countQuery),
      ]);
      const endTime = Date.now();
      console.log(`[debug]: Fetching customers took ${endTime - startTime} ms`);

      return {
        data: result.map((x) => {
          return new CustomerModel({
            id: x.id,
            name: x.name,
            address: x.address,
            npwp: x.npwp,
            pic: x.pic,
            phone_number: x.phone_number,
            created_at: x.created_at,
            is_delete: x.is_delete,
            can_delete: x.can_delete,
            created_by: x.created_by,
          });
        }),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching customer data: ${error}`);
      throw error;
    }
  }

  async fetchByID(id: number): Promise<CustomerModel | null> {
    try {
      const customer = await this.prisma.$queryRaw<any[]>`
        SELECT customer.id, customer.name, customer.address, 
        customer.pic, customer.npwp, customer.phone_number, 
        IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
        FROM customer
        LEFT JOIN (
          SELECT COUNT(sales_invoice_code.id) AS count, sales_invoice_code.customer_id
          FROM sales_invoice_code
          WHERE sales_invoice_code.is_delete = 0
          AND sales_invoice_code.customer_id = ${id}
        ) itemCount
        ON customer.id = itemCount.customer_id
        WHERE customer.id = ${id}
      `;

      if (!customer) {
        return null;
      }

      if (customer.length == 0) {
        return null;
      }

      const customerData = customer[0];
      return new CustomerModel({
        id: customerData.id,
        name: customerData.name,
        address: customerData.address,
        npwp: customerData.npwp,
        pic: customerData.pic,
        phone_number: customerData.phone_number,
        can_delete: customerData.can_delete,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching customer by ID: ${error}`);
      throw error;
    }
  }

  async fetchByIDs(ids: number[]): Promise<CustomerModel[]> {
    if (ids.length === 0) return Promise.resolve([]);

    try {
      const result = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT customer.id, IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
        FROM customer
        LEFT JOIN (
          SELECT COUNT(sales_invoice_code.id) AS count, sales_invoice_code.customer_id
          FROM sales_invoice_code
          WHERE sales_invoice_code.is_delete = 0
        ) itemCount
        ON customer.id = itemCount.customer_id
        WHERE customer.id IN (${ids.join(",")})
      `);

      return result.map((item) => {
        return new CustomerModel({
          id: item.id,
          name: item.name,
          address: item.address,
          npwp: item.npwp,
          pic: item.pic,
          phone_number: item.phone_number,
          can_delete: item.can_delete,
        });
      });
    } catch (error) {
      console.error(`[error]: Error on fetching customers by IDs: ${error}`);
      throw error;
    }
  }

  async fetchAutocomplete(keyword: string): Promise<CustomerModel[]> {
    try {
      const result = await this.prisma.customer.findMany({
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
        take: 5,
        skip: 0,
      });

      return result.map((item) => {
        return new CustomerModel({
          id: item.id,
          name: item.name,
          address: item.address,
          npwp: item.npwp,
          pic: item.pic,
          phone_number: item.phone_number,
          created_at: item.created_at,
          is_delete: item.is_delete,
          created_by: item.created_by,
        });
      });
    } catch (error) {
      console.error(
        `[error]: Error on fetching customer autocomplete: ${error}`
      );
      throw error;
    }
  }

  async fetchSalesStatistics(userID: number): Promise<number> {
    try {
      const count = await this.prisma.customer.count({
        where: {
          created_by: userID,
        },
      });

      return count;
    } catch (error) {
      console.error(`[error]: Error on fetching customer statistics: ${error}`);
      throw error;
    }
  }

  async fetchAll(): Promise<CustomerModel[]> {
    try {
      const result = await this.prisma.customer.findMany({
        where: {
          is_delete: false,
        },
      });

      return result.map((item) => {
        return new CustomerModel({
          id: item.id,
          name: item.name,
          address: item.address,
          npwp: item.npwp,
          pic: item.pic,
          phone_number: item.phone_number,
          created_at: item.created_at,
          is_delete: item.is_delete,
          created_by: item.created_by,
        });
      });
    } catch (error) {
      console.error(`[error]: Error on fetching all customers: ${error}`);
      throw error;
    }
  }
}
