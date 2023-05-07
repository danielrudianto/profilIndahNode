import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CustomerModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  pic: string;
  phone_number: string;
  created_by: number;
  created_at: Date;

  constructor(
    name: string,
    address: string,
    npwp: string | null,
    pic: string,
    phone_number: string,
    created_by: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.address = address;
    this.npwp = npwp;
    this.pic = pic;
    this.phone_number = phone_number;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.customer.create({
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        pic: this.pic,
        phone_number: this.phone_number,
        created_by: this.created_by,
        created_at: this.created_at,
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

  update() {
    return prisma.customer.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        pic: this.pic,
        phone_number: this.phone_number,
        updated_by: this.created_by,
        updated_at: this.created_at,
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

  static fetchAutocomplete(keyword: string) {
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
      take: 5,
      skip: 0,
    });
  }

  static fetch(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.$queryRaw<any[]>`
          SELECT customer.id, customer.name, customer.address, customer.pic, customer.npwp, customer.phone_number, COALESCE(itemCount.count, 0) AS count
          FROM customer
          LEFT JOIN (
            SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
            FROM bill_code
            JOIN customer ON bill_code.customer_id = customer.id
            WHERE bill_code.is_delete = 0
            GROUP BY bill_code.customer_id
          ) itemCount
          ON customer.id = itemCount.customer_id
          WHERE customer.is_delete = 0
          ORDER BY customer.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
        prisma.customer.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
          SELECT customer.id, customer.name, customer.address, customer.pic, customer.npwp, customer.phone_number, COALESCE(itemCount.count, 0) AS count
          FROM customer
          LEFT JOIN (
            SELECT COUNT(bill_code.id) AS count, bill_code.customer_id
            FROM bill_code
            JOIN customer ON bill_code.customer_id = customer.id
            WHERE bill_code.is_delete = 0
            GROUP BY bill_code.customer_id
          ) itemCount
          ON customer.id = itemCount.customer_id
          WHERE customer.is_delete = 0
          AND (
            customer.name LIKE '%${keyword}%'
            OR customer.address LIKE '%${keyword}%'
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
    }
  }

  static fetchById(id: number) {
    return prisma.$queryRaw<any[]>`
      SELECT customer.id, customer.name, customer.address, customer.pic, customer.npwp, customer.phone_number, COALESCE(itemCount.count, 0) AS count
      FROM customer
      LEFT JOIN (
        SELECT COUNT(bill_code.id) AS count
        FROM bill_code
        WHERE bill_code.is_delete = 0
        AND bill_code.customer_id = ${id}
      ) itemCount
      ON customer.id = itemCount.customer_id
      WHERE AND customer.id = ${id}
    `;
  }
}

export default CustomerModel;
