import { PrismaClient } from "@prisma/client";
import { sales_return } from "../interface/sales_return";

const prisma = new PrismaClient();

class SalesReturnModel {
  id?: number;
  name: string;
  date: Date;
  is_confirm: boolean = false;
  is_delete: boolean = false;
  confirmed_by?: number | null;
  confirmed_at?: Date | null;
  payment_method_id: number | null;
  created_by: number;
  created_at: Date;
  sales_return: sales_return[];

  confirmed: boolean;

  constructor(
    name: string,
    date: Date,
    created_by: number,
    payment_method_id: number | null,
    sales_return: sales_return[] = [],
    id: number | null,
    is_confirm: boolean = true
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.date = date;
    this.created_by = created_by;
    this.created_at = new Date();
    this.payment_method_id = payment_method_id;
    this.confirmed = is_confirm;
    this.sales_return = sales_return;
  }

  create() {
    return prisma.sales_return_code.create({
      data: {
        name: this.name,
        date: this.date,
        created_by: this.created_by,
        created_at: this.created_at,
        is_confirm: this.confirmed ? true : false,
        confirmed_by: this.confirmed ? this.created_by : null,
        confirmed_at: this.confirmed ? new Date() : null,
        payment_method_id: this.payment_method_id,
        sales_return: {
          create: this.sales_return.map((x) => {
            return {
              bill_id: x.bill_id,
              quantity: x.quantity,
            };
          }),
        },
      },
    });
  }

  static fetchArchiveYears(mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(sales_return_code.date)) AS year, COUNT(id) AS count
      FROM sales_return_code
      WHERE sales_return_code.date IS NOT NULL
      GROUP BY YEAR(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(sales_return_code.date)) AS year, COUNT(id) AS count
      FROM sales_return_code
      WHERE sales_return_code.is_delete = 1
      AND sales_return_code.date IS NOT NULL
      GROUP BY YEAR(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(sales_return_code.date)) AS year, COUNT(id) AS count
      FROM sales_return_code
      WHERE sales_return_code.is_delete = 0
      AND sales_return_code.date IS NOT NULL
      GROUP BY YEAR(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
    }
  }

  static fetchArchiveMonths(year: number, mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(sales_return_code.date)) AS month, COUNT(id) AS count
      FROM sales_return_code
      WHERE YEAR(sales_return_code.date) = ${year}
      GROUP BY MONTH(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(sales_return_code.date)) AS month, COUNT(id) AS count
      FROM sales_return_code
      WHERE YEAR(sales_return_code.date) = ${year}
      AND sales_return_code.is_delete = 1
      GROUP BY MONTH(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(sales_return_code.date)) AS month, COUNT(id) AS count
      FROM sales_return_code
      WHERE YEAR(sales_return_code.date) = ${year}
      AND sales_return_code.is_delete = 0
      GROUP BY MONTH(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
    }
  }

  static fetchArchive(year: number, month: number, page: number, mode: number) {
    if (mode == 0) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT sales_return_code.id, sales_return_code.date, sales_return_code.name, sales_return_code.is_delete, customer.id AS customer_id, COALESCE(customer.name, 'Retail customer') AS customer_name, sales_return_code.is_confirm
        FROM sales_return_code
        JOIN (
          SELECT sales_return_code_id, customer_id
          FROM sales_return_code
          JOIN sales_return ON sales_return_code.id = sales_return.sales_return_code_id
          JOIN bill ON sales_return.bill_id = bill.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          GROUP BY sales_return_code.id
        ) salesReturnCount
        LEFT JOIN customer ON salesReturnCount.customer_id = customer.id
        WHERE YEAR(sales_return_code.date) = ${year} AND MONTH(sales_return_code.date) = ${
          month + 1
        }
        ORDER BY sales_return_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM sales_return_code
          WHERE YEAR(sales_return_code.date) = ${year} AND MONTH(sales_return_code.date) = ${
          month + 1
        }
        `,
      ]);
    } else if (mode == 1) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT sales_return_code.id, sales_return_code.date, sales_return_code.name, sales_return_code.is_delete, customer.id AS customer_id, COALESCE(customer.name, 'Retail customer') AS customer_name, sales_return_code.is_confirm
        FROM sales_return_code
        JOIN (
          SELECT sales_return_code_id, customer_id
          FROM sales_return_code
          JOIN sales_return ON sales_return_code.id = sales_return.sales_return_code_id
          JOIN bill ON sales_return.bill_id = bill.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          GROUP BY sales_return_code.id
        ) salesReturnCount
        LEFT JOIN customer ON salesReturnCount.customer_id = customer.id
        WHERE YEAR(sales_return_code.date) = ${year} AND MONTH(sales_return_code.date) = ${
          month + 1
        }
        AND sales_return_code.is_delete = 1
        ORDER BY sales_return_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM sales_return_code
          WHERE YEAR(sales_return_code.date) = ${year} AND MONTH(sales_return_code.date) = ${
          month + 1
        }
        AND sales_return_code.is_delete = 1
        `,
      ]);
    } else if (mode == 2) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT sales_return_code.id, sales_return_code.date, sales_return_code.name, sales_return_code.is_delete, customer.id AS customer_id, COALESCE(customer.name, 'Retail customer') AS customer_name, sales_return_code.is_confirm
        FROM sales_return_code
        JOIN (
          SELECT sales_return_code_id, customer_id
          FROM sales_return_code
          JOIN sales_return ON sales_return_code.id = sales_return.sales_return_code_id
          JOIN bill ON sales_return.bill_id = bill.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          GROUP BY sales_return_code.id
        ) salesReturnCount
        LEFT JOIN customer ON salesReturnCount.customer_id = customer.id
        WHERE YEAR(sales_return_code.date) = ${year} AND MONTH(sales_return_code.date) = ${
          month + 1
        }
        AND sales_return_code.is_delete = 0
        ORDER BY sales_return_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM sales_return_code
          WHERE YEAR(sales_return_code.date) = ${year} AND MONTH(sales_return_code.date) = ${
          month + 1
        }
        AND sales_return_code.is_delete = 0
        `,
      ]);
    }
  }

  static fetchById(id: number) {
    return prisma.sales_return_code.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        date: true,
        payment_method: {
          select: {
            name: true,
          },
        },
        created_at: true,
        user_sales_return_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        sales_return: {
          select: {
            bill: {
              select: {
                bill_code_id: true,
                quantity: true,
                price: true,
                discount: true,
                item: {
                  select: {
                    id: true,
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
                bill_code: {
                  select: {
                    customer: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            quantity: true,
          },
        },
        is_confirm: true,
        is_delete: true,
      },
    });
  }

  static deleteById(id: number, created_by: number) {
    return prisma.sales_return_code.update({
      where: {
        id: id,
      },
      data: {
        is_confirm: false,
        is_delete: true,
        confirmed_at: new Date(),
        confirmed_by: created_by,
      },
    });
  }

  static fetchCodeById(id: number) {
    return prisma.sales_return_code.findFirst({
      where: {
        sales_return: {
          some: {
            id: id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        date: true,
        created_at: true,
        user_sales_return_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        sales_return: {
          select: {
            id: true,
            quantity: true,
            bill: {
              select: {
                item: {
                  select: {
                    reference: true,
                    description: true,
                    item_brand: {
                      select: {
                        name: true,
                      },
                    },
                    item_type: {
                      select: {
                        name: true,
                      },
                    },
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
        },
      },
    });
  }

  static fetchSearch(date: Date, items: any[]) {
    let mysql_string = "";

    items.forEach((x) => {
      if (x.item_unit_id == null) {
        mysql_string += `
          AND bill_code.id IN (
            SELECT DISTINCT(bill.bill_code_id) AS id
            FROM bill
            WHERE bill.item_id = ${x.item_id}
            AND bill.item_unit_id IS NULL 
            AND bill.quantity >= ${x.quantity}
          )`;
      } else {
        mysql_string += `
          AND bill_code.id IN (
            SELECT DISTINCT(bill.bill_code_id) AS id
            FROM bill
            WHERE bill.item_id = ${x.item_id}
            AND bill.item_unit_id = ${x.item_unit_id}
            AND bill.quantity >= ${x.quantity}
          )`;
      }
    });

    return prisma.$queryRawUnsafe(`
      SELECT bill_code.id, bill_code.date, bill_code.name, COALESCE(customer.name, 'Retail') AS customer_name
      FROM bill_code
      LEFT JOIN customer ON bill_code.customer_id = customer.id
      WHERE DAY(bill_code.date) = ${date.getDate()}
      AND MONTH(bill_code.date) = ${date.getMonth() + 1}
      AND YEAR(bill_code.date) = ${date.getFullYear()}
      ${mysql_string}
    `);
  }
}

export default SalesReturnModel;
