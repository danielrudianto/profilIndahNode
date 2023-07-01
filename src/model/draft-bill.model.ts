import { PrismaClient } from "@prisma/client";
import moment from "moment";
import { v4 } from "uuid";

const prisma = new PrismaClient();

export class DraftBillModel {
  customer_id: number;
  created_by: number;
  note: string;
  items: any[];
  name: string;
  service: number;
  delivery: number;

  constructor(
    customer_id: number,
    note: string,
    items: any[],
    created_by: number,
    name: string,
    service: number,
    delivery: number
  ) {
    this.created_by = created_by;
    this.customer_id = customer_id;
    this.items = items;
    this.note = note;
    this.name = name;
    this.service = service;
    this.delivery = delivery;
  }

  create() {
    return prisma.draft_bill_code.create({
      data: {
        name: this.name,
        delivery: this.delivery,
        service: this.service,
        note: this.note,
        created_at: new Date(),
        created_by: this.created_by,
        customer_id: this.customer_id,
        draft_bill: {
          createMany: {
            data: this.items.map((x) => {
              return {
                item_id: x.item_id,
                quantity: x.quantity,
                price: x.price,
                discount: 0,
                item_unit_id: x.item_unit_id,
              };
            }),
          },
        },
      },
      select: {
        id: true,
        note: true,
        name: true,
        created_at: true,
        user_draft_bill_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
            npwp: true,
            phone_number: true,
            id: true,
          },
        },
        delivery: true,
        service: true,
        draft_bill: {
          select: {
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                item_type: {
                  select: {
                    name: true,
                  },
                },
                item_brand: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            item_unit: {
              select: {
                conversion: true,
                unit: true,
              },
            },
            quantity: true,
            price: true,
            discount: true,
          },
        },
      },
    });
  }

  static fetchByID(id: number) {
    return prisma.draft_bill_code.findUnique({
      where: {
        id: id,
      },
      include: {
        user_draft_bill_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
            phone_number: true,
            pic: true,
          },
        },
        draft_bill: {
          select: {
            id: true,
            price: true,
            discount: true,
            quantity: true,
            item_id: true,
            item_unit_id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
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
      },
    });
  }

  static fetchUnconfirmed(page: number = 1, keyword: string) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.name, draft_bill_code.created_at, user.name as created_by, customer.name as customer_name, total.total
        FROM draft_bill_code
        INNER JOIN user ON draft_bill_code.created_by = user.id
        LEFT JOIN customer ON draft_bill_code.customer_id = customer.id
        JOIN (
          SELECT SUM(draft_bill.quantity * draft_bill.price) as total, draft_bill.draft_bill_code_id
          FROM draft_bill
          GROUP BY draft_bill.draft_bill_code_id
        ) as total 
        ON total.draft_bill_code_id = draft_bill_code.id
        WHERE draft_bill_code.is_delete = 0
        ORDER BY draft_bill_code.id DESC
        LIMIT 10 OFFSET ${(page - 1) * 10}
      `),
        prisma.draft_bill_code.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.$queryRawUnsafe(`
        SELECT draft_bill_code.id, draft_bill_code.name, draft_bill_code.created_at, user.name as created_by, customer.name as customer_name, total.total
        FROM draft_bill_code
        INNER JOIN user ON draft_bill_code.created_by = user.id
        LEFT JOIN customer ON draft_bill_code.customer_id = customer.id
        JOIN (
          SELECT SUM(draft_bill.quantity * draft_bill.price) as total, draft_bill.draft_bill_code_id
          FROM draft_bill
          GROUP BY draft_bill.draft_bill_code_id
        ) as total 
        ON total.draft_bill_code_id = draft_bill_code.id
        WHERE draft_bill_code.is_delete = 0
        AND draft_bill_code.name LIKE '%${keyword}%'
        OR customer.name LIKE '%${keyword}%'
        ORDER BY draft_bill_code.id DESC
        LIMIT 10 OFFSET ${(page - 1) * 10}
      `),
        prisma.draft_bill_code.count({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                customer: {
                  name: {
                    contains: keyword,
                  },
                },
              },
            ],
          },
        }),
      ]);
    }
  }

  static confirm(
    id: number,
    name: string,
    date: Date,
    customer_id: number | null,
    payment_method_id: number | null,
    service: number,
    delivery: number,
    discount: number,
    items: any[],
    userID: number
  ) {
    return prisma.$transaction([
      prisma.draft_bill_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          confirmed_at: new Date(),
          confirmed_by: userID,
        },
      }),
      prisma.bill_code.create({
        data: {
          name: name,
          date: new Date(moment(date).format("YYYY-MM-DD")),
          customer_id: customer_id,
          payment_method_id: payment_method_id,
          service: service,
          delivery: delivery,
          discount: discount,
          uuid: v4(),
          created_at: new Date(),
          created_by: userID,
          is_confirm: true,
          confirmed_at: new Date(),
          confirmed_by: userID,
          bill: {
            createMany: {
              data: items.map((x) => {
                return {
                  item_id: x.item_id,
                  quantity: x.quantity,
                  price: x.price,
                  discount: x.discount,
                  item_unit_id: x.item_unit_id,
                };
              }),
            },
          },
        },
      }),
    ]);
  }

  static delete(id: number, userID: number) {
    return prisma.draft_bill_code.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        confirmed_at: new Date(),
        confirmed_by: userID,
      },
    });
  }

  static fetchArchiveYears(mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 1
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(draft_bill_code.created_at)) AS year, COUNT(id) AS count
      FROM draft_bill_code
      WHERE draft_bill_code.is_delete = 0
      AND draft_bill_code.created_at IS NOT NULL
      GROUP BY YEAR(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    }
  }

  static fetchArchiveMonths(year: number, mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 1
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(draft_bill_code.created_at)) AS month, COUNT(id) AS count
      FROM draft_bill_code
      WHERE YEAR(draft_bill_code.created_at) = ${year}
      AND draft_bill_code.is_delete = 0
      GROUP BY MONTH(draft_bill_code.created_at)
      ORDER BY draft_bill_code.created_at ASC
    `;
    }
  }

  static fetchArchive(year: number, month: number, page: number, mode: number) {
    if (mode == 0) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
        FROM draft_bill_code
        WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
          month + 1
        }
        ORDER BY draft_bill_code.created_at ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
          month + 1
        }
        `,
      ]);
    } else if (mode == 1) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
        FROM draft_bill_code
        WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
          month + 1
        }
        AND draft_bill_code.is_delete = 1
        ORDER BY draft_bill_code.created_at ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
          month + 1
        }
        AND draft_bill_code.is_delete = 1
        `,
      ]);
    } else if (mode == 2) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT draft_bill_code.id, draft_bill_code.created_at, draft_bill_code.name, draft_bill_code.is_delete
        FROM draft_bill_code
        WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
          month + 1
        }
        AND draft_bill_code.is_delete = 0
        ORDER BY draft_bill_code.created_at ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM draft_bill_code
          WHERE YEAR(draft_bill_code.created_at) = ${year} AND MONTH(draft_bill_code.created_at) = ${
          month + 1
        }
        AND draft_bill_code.is_delete = 0
        `,
      ]);
    }
  }
}
