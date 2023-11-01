import {
  AnnualArchive,
  ArchiveCount,
  BillArchive,
  IFetchArchive,
  MonthlyArchive,
} from "../interface/archive.interface";
import { prisma } from "../app";

interface ICreateBill {
  name: string;
  customer_id: number | null;
  created_by: number;
  payment_method_id: number | null;
  discount: number;
  delivery: number;
  service: number;
  date: Date;
  uuid: string;
  items: ICreateBillItem[];
}

interface ICreateBillItem {
  package_code_id: number | null;
  item_id: number | null;
  item_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
}

interface IReportBill {
  value: number;
  service: number;
  delivery: number;
  discount: number;
}

class BillCodeModel {
  /**
   * Create new bill code
   * @param data
   * @returns BillCode
   */
  static create(data: ICreateBill) {
    return prisma.bill_code.create({
      data: {
        name: data.name,
        created_by: data.created_by,
        created_at: new Date(),
        customer_id: data.customer_id,
        payment_method_id: data.payment_method_id,
        discount: data.discount,
        delivery: data.delivery,
        service: data.service,
        date: data.date,
        is_confirm: true,
        confirmed_by: data.created_by,
        confirmed_at: new Date(),
        uuid: data.uuid,
        bill: {
          createMany: {
            data: data.items,
          },
        },
      },
      include: {
        bill: {
          include: {
            package_code: {
              include: {
                package_content: {
                  select: {
                    quantity: true,
                    item_id: true,
                    item_unit: {
                      select: {
                        unit: true,
                        conversion: true,
                      },
                    },
                    item: {
                      select: {
                        reference: true,
                        description: true,
                        unit: true,
                      },
                    },
                    price: true,
                    discount: true,
                  },
                },
              },
            },
            item_unit: {
              select: {
                unit: true,
                conversion: true,
              },
            },
            item: {
              select: {
                id: true,
                reference: true,
                description: true,
                unit: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Generate bill code name based on date
   * @param date
   * @returns string
   */
  static generateName(date: Date = new Date()) {
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

  /**
   * Fetch bill code by id
   * @param id
   * @returns BillCode
   */
  static fetchByID(id: number) {
    return prisma.bill_code.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        date: true,
        discount: true,
        delivery: true,
        service: true,
        bill: {
          select: {
            id: true,
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
            package_code_id: true,
            package_code: {
              select: {
                name: true,
                description: true,
                package_content: {
                  select: {
                    item_id: true,
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
                    quantity: true,
                  },
                },
              },
            },
            quantity: true,
            price: true,
            discount: true,
            item_unit_id: true,
            item_id: true,
          },
        },
        user_bill_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        is_confirm: true,
        is_delete: true,
        created_at: true,
        payment_method: {
          select: {
            name: true,
            description: true,
          },
        },
        customer: {
          select: {
            name: true,
            address: true,
          },
        },
      },
    });
  }

  /**
   * Search for bill codes
   * Based on customer, item, date, keyword, page, and mode
   * @param customers
   * @param items
   * @param date
   * @param keyword
   * @param page
   * @param mode
   * @returns
   */
  static search(
    customers: number[],
    items: number[],
    date: any[],
    keyword: string,
    page: number,
    mode: number
  ) {
    let query = `SELECT bill_code.name, bill_code.id, bill_code.date, COALESCE(customer.name, 'Retail customer') AS customer_name, bill_code.is_confirm, bill_code.is_delete
      FROM bill_code 
      LEFT JOIN customer ON bill_code.customer_id = customer.id`;
    let conditionalQueries = "";
    if (items.length > 0) {
      conditionalQueries += ` JOIN (
        SELECT bill.bill_code_id
        FROM bill
        WHERE bill.item_id IN (${items.join(",")})
        GROUP BY bill.bill_code_id
        UNION ALL SELECT bill.bill_code_id
        FROM bill
        JOIN package_code ON bill.package_code_id = package_code.id
        JOIN package_content ON package_code.id = package_content.package_code_id
        JOIN item ON package_content.item_id = item.id
        WHERE item.id IN (${items.join(",")})
        GROUP BY bill.bill_code_id
      ) billCount ON bill_code.id = billCount.bill_code_id`;
    }

    conditionalQueries += ` WHERE 1 = 1`;

    if (customers.length > 0) {
      conditionalQueries += ` AND bill_code.customer_id IN (${customers
        .filter((x) => x != 0)
        .join(",")})`;
    }

    if (customers.includes(0)) {
      conditionalQueries += ` OR bill_code.customer_id IS NULL`;
    }

    if (date[0] != null && date[1] != null) {
      conditionalQueries += ` AND bill_code.date BETWEEN '${date[0]}' AND '${date[1]}'`;
    }

    if (keyword != "") {
      conditionalQueries += ` AND bill_code.name LIKE '%${keyword}%'`;
    }

    if (mode == 0) {
      conditionalQueries += ` AND bill_code.is_confirm = 1 AND bill_code.is_delete = 0`;
    } else if (mode == 1) {
      conditionalQueries += ` AND bill_code.is_confirm = 0 AND bill_code.is_delete = 1`;
    }

    return prisma.$transaction([
      prisma.$queryRawUnsafe<any[]>(
        `${query} ${conditionalQueries} ORDER BY bill_code.date DESC LIMIT 10 OFFSET ${
          (page - 1) * 10
        }`
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(bill_code.id) AS count FROM bill_code ${conditionalQueries}`
      ),
    ]);
  }

  /**
   * Fetch bill code and group them by year
   * @param mode
   * @returns AnnualArchive[]
   */
  static fetchArchiveYears() {
    return prisma.$queryRaw<AnnualArchive[]>`
      SELECT DISTINCT(YEAR(bill_code.date)) AS year, COUNT(id) AS count
      FROM bill_code
      GROUP BY YEAR(bill_code.date)
    `;
  }

  /**
   * Fetch monthly archive
   * @param year
   * @returns  MonthlyArchive[]
   */
  static fetchArchiveMonths(year: number) {
    return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT DISTINCT(MONTH(bill_code.date)) AS month, 
      YEAR(bill_code.date) AS year,
       COUNT(id) AS count
      FROM bill_code
      WHERE YEAR(bill_code.date) = ${year}
      GROUP BY MONTH(bill_code.date)
    `;
  }

  /**
   * Fetch archive by year and month
   * @param IFetchArchiveBill
   * @returns Promise<BillArchive[]>
   */
  static fetchArchive(data: IFetchArchive) {
    switch (data.mode) {
      case 0:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<BillArchive[]>(`
            SELECT bill_code.id, bill_code.date, bill_code.name, 
            bill_code.is_delete, 
            COALESCE(customer.name, 'Retail customer') AS customer_name, 
            bill_code.is_confirm, bill_code.customer_id
            FROM bill_code
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            WHERE YEAR(bill_code.date) = ${
              data.year
            } AND MONTH(bill_code.date) = ${data.month + 1}
            ${
              data.keyword == null
                ? ""
                : `AND (bill_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`
            }
            ORDER BY date ASC
            LIMIT ${data.limit}
            OFFSET ${data.offset}
          `),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
            SELECT COUNT(bill_code.id) AS count 
            FROM bill_code
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            WHERE YEAR(bill_code.date) = ${
              data.year
            } AND MONTH(bill_code.date) = ${data.month + 1}
            ${
              data.keyword == null
                ? ""
                : `AND (bill_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`
            }
          `),
        ]);
      case 1:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<BillArchive[]>(`
          SELECT * 
          FROM (
            SELECT bill_code.id, bill_code.date, bill_code.name, 
            bill_code.is_delete, 
            COALESCE(customer.name, 'Retail customer') AS customer_name, 
            bill_code.is_confirm, bill_code.customer_id
            FROM bill_code
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            WHERE YEAR(bill_code.date) = ${
              data.year
            } AND MONTH(bill_code.date) = ${data.month + 1}
            AND bill_code.is_delete = 1
            ${
              data.keyword == null
                ? ""
                : `AND (bill_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`
            }
            ORDER BY date ASC
            LIMIT ${data.limit}
            OFFSET ${data.offset}
          ) AS bill 
          `),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
            SELECT COUNT(bill_code.id) AS count FROM bill_code
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            WHERE YEAR(bill_code.date) = ${
              data.year
            } AND MONTH(bill_code.date) = ${
            data.month + 1
          } AND bill_code.is_delete = 1
          ${
            data.keyword == null
              ? ""
              : `AND (bill_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`
          }
          `),
        ]);
      case 2:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<BillArchive[]>(`
          SELECT * 
          FROM (
            SELECT bill_code.id, bill_code.date, bill_code.name, 
            bill_code.is_delete, 
            COALESCE(customer.name, 'Retail customer') AS customer_name, 
            bill_code.is_confirm, bill_code.customer_id
            FROM bill_code
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            WHERE YEAR(bill_code.date) = ${
              data.year
            } AND MONTH(bill_code.date) = ${data.month + 1}
            AND bill_code.is_delete = 0
            ${
              data.keyword == null
                ? ""
                : `AND (bill_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`
            }
            ORDER BY date ASC
            LIMIT ${data.limit}
            OFFSET ${data.offset}
          ) AS bill
          `),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
            SELECT COUNT(bill_code.id) AS count FROM bill_code
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            WHERE YEAR(bill_code.date) = ${
              data.year
            } AND MONTH(bill_code.date) = ${
            data.month + 1
          } AND bill_code.is_delete = 0
          ${
            data.keyword == null
              ? ""
              : `AND (bill_code.name LIKE '%${data.keyword}%' 
              OR COALESCE(customer.name, 'Retail customer') 
              LIKE '%${data.keyword}%')`
          }
          `),
        ]);
    }
  }

  /**
   * Delete bill code by id
   * @param id
   * @param deleted_by
   * @returns BillCode
   */
  static deleteByID(id: number, deleted_by: number) {
    return prisma.bill_code.update({
      where: {
        id: id,
      },
      data: {
        is_confirm: false,
        is_delete: true,
        confirmed_at: new Date(),
        confirmed_by: deleted_by,
      },
    });
  }

  static fetchChartItems(monthly: boolean, limit: number, offset: number) {
    const date = new Date();
    const start_date = new Date();

    if (monthly) {
      date.setMonth(date.getMonth() - offset);
      start_date.setMonth(date.getMonth() - limit - offset);

      const prev_date = new Date();
      const start_prev_date = new Date();
      prev_date.setMonth(date.getMonth() - offset - 12);
      start_prev_date.setMonth(date.getMonth() - limit - offset - 12);

      return prisma.$transaction([
        prisma.$queryRawUnsafe(`SELECT year, month, (delivery + value - discount + service) AS value, diff FROM (
          SELECT YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, SUM(bill_code.delivery) AS delivery, SUM(bill_code.discount) AS discount, SUM(a.value) AS value, SUM(bill_code.service) AS service, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
          FROM bill_code
          JOIN (
            SELECT (SUM(bill.price - bill.discount) * bill.quantity) AS value, bill_code_id
            FROM bill
            GROUP BY bill.bill_code_id
          ) AS a
          ON bill_code.id = a.bill_code_id
          WHERE bill_code.date BETWEEN '${start_date
            .getFullYear()
            .toString()}-${(start_date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-01' AND LAST_DAY('${date
          .getFullYear()
          .toString()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01')
          AND bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)) AS bill_a`),
        prisma.$queryRawUnsafe(`SELECT year, month, (delivery + value - discount + service) AS value, diff FROM (
          SELECT YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, SUM(bill_code.delivery) AS delivery, SUM(bill_code.discount) AS discount, SUM(a.value) AS value, SUM(bill_code.service) AS service, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
          FROM bill_code
          JOIN (
            SELECT (SUM(bill.price - bill.discount) * bill.quantity) AS value, bill_code_id
            FROM bill
            GROUP BY bill.bill_code_id
            ) AS a
          ON bill_code.id = a.bill_code_id
          WHERE bill_code.date BETWEEN '${start_prev_date
            .getFullYear()
            .toString()}-${(start_prev_date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-01' AND LAST_DAY('${prev_date
          .getFullYear()
          .toString()}-${(prev_date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-01')
          AND bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)) AS bill_a`),
      ]);
    } else {
      date.setDate(date.getDate() - offset);
      start_date.setDate(date.getDate() - limit - offset);
      return prisma.$queryRawUnsafe(`SELECT diff, (delivery + value - discount + service) AS value FROM (
        SELECT datediff(curdate(), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(bill_code.date),2,'00')), '%Y-%m-%d')) AS diff, SUM(a.value) AS value, SUM(delivery) AS delivery, SUM(discount) AS discount, SUM(service) AS service
        FROM bill_code
        JOIN (
          SELECT (SUM(bill.price - bill.discount) * bill.quantity) AS value, bill_code_id
          FROM bill
          GROUP BY bill.bill_code_id
        ) AS a
        ON bill_code.id = a.bill_code_id
        WHERE bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(
        start_date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${start_date
        .getDate()
        .toString()
        .padStart(2, "0")}' AND '${date.getFullYear().toString()}-${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
        AND bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        GROUP BY YEAR(bill_code.date), MONTH(bill_code.date), DAY(bill_code.date)) AS bill_a`);
    }
  }

  static fetchByCustomerId(customer_id: number | null) {
    if (customer_id == null) {
      return prisma.$queryRaw`
        SELECT SUM(bill_.value + bill_code.delivery - bill_code.discount + bill_code.service) AS value, COUNT(bill_code) AS count
        FROM bill_code
        JOIN (
          SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
          FROM bill
          GROUP BY bill.bill_code_id
        ) AS bill_
        ON bill_code.id = bill_.bill_code_id = bill_code.id
        WHERE bill_code.customer_id IS NULL
      `;
    } else {
      return prisma.$queryRaw`
        SELECT SUM(bill_.value + bill_code.delivery - bill_code.discount + bill_code.service) AS value, COUNT(bill_code) AS count
        FROM bill_code
        JOIN (
          SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
          FROM bill
          GROUP BY bill.bill_code_id
        ) AS bill_
        ON bill_code.id = bill_.bill_code_id = bill_code.id
        WHERE bill_code.customer_id = ${customer_id}
      `;
    }
  }

  static fetchSum(month: number = 0, year: number) {
    if (month == 0) {
      // Fetch annual sales
      return prisma.$queryRawUnsafe<IReportBill[]>(`
        SELECT SUM(value) AS value, SUM(discount) AS discount, 
        SUM(delivery) AS delivery, SUM(service) AS service
        FROM bill_code
        JOIN (
          SELECT SUM((bill.quantity - COALESCE(returnTable.quantity, 0)) * (bill.price - bill.discount)) AS value, bill_code_id
          FROM bill
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id AS id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_delete = 0
            AND sales_return_code.is_confirm = 1
            GROUP BY sales_return.bill_id
          ) returnTable
          ON returnTable.id = bill.id
          GROUP BY bill.bill_code_id
        ) bills
        ON bill_code.id = bills.bill_code_id
        AND YEAR(bill_code.date) = ${year}
        AND bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
      `);
    } else {
      // Fetch monthly sales
      return prisma.$queryRawUnsafe<IReportBill[]>(`
        SELECT SUM(value) AS value, SUM(discount) AS discount, 
        SUM(delivery) AS delivery, SUM(service) AS service
        FROM bill_code
        JOIN (
          SELECT SUM((bill.quantity - COALESCE(returnTable.quantity, 0)) * (bill.price - bill.discount)) AS value, bill_code_id
          FROM bill
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id AS id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_delete = 0
            AND sales_return_code.is_confirm = 1
            GROUP BY sales_return.bill_id
          ) returnTable
          ON returnTable.id = bill.id
          GROUP BY bill.bill_code_id
        ) bills
        ON bill_code.id = bills.bill_code_id
        WHERE MONTH(bill_code.date) = ${month}
        AND YEAR(bill_code.date) = ${year}
        AND bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
      `);
    }
  }

  static fetchMoneyReceipt(formattedDate: string) {
    return prisma.$queryRawUnsafe(`
      SELECT payment_method.id, COALESCE(payment_method.name, "Cash") AS name, pm.value
      FROM payment_method
      RIGHT JOIN (
        SELECT SUM(a.value + delivery - discount + service) AS value, payment_method_id
        FROM bill_code
        JOIN (
          SELECT SUM((bill.price - bill.discount) * bill.quantity) AS value, bill_code_id
          FROM bill
          GROUP BY bill.bill_code_id
        ) a
        ON bill_code.id = a.bill_code_id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND bill_code.date = '${formattedDate}'
        GROUP BY bill_code.payment_method_id
      ) pm
      ON payment_method.id = pm.payment_method_id
      ORDER BY payment_method.id ASC
    `);
  }

  static fetchTodaySales(date: Date = new Date()) {
    return prisma.$queryRawUnsafe(`
      SELECT COALESCE(SUM(a.value), 0) AS value, COALESCE(SUM(a.discount), 0) AS discount, COALESCE(SUM(a.service), 0) AS service, COALESCE(SUM(a.delivery), 0) AS delivery
      FROM (
        SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill_code.discount, bill_code.service, bill_code.delivery
        FROM bill
        JOIN bill_code
        ON bill.bill_code_id = bill_code.id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND bill_code.date = '${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
        GROUP BY bill.bill_code_id
      ) AS a
    `);
  }

  static fetchAppendix(month: number, year: number) {
    return prisma.$queryRawUnsafe(`
        SELECT bill_code.date, bill_code.name, 
        COALESCE(customer.name, "Retail") AS customer_name, 
        billValue.discount, billValue.value, bill_code.delivery, 
        bill_code.service
        FROM bill_code
        JOIN (
          SELECT SUM((bill.quantity - COALESCE(returnTable.quantity, 0)) * bill.price) AS value, 
          SUM((bill.quantity - COALESCE(returnTable.quantity, 0)) * bill.discount) AS discount, 
          bill.bill_code_id
          FROM bill
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_confirm = 1
            AND sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
          ) returnTable
          ON bill.id = returnTable.bill_id
          GROUP BY bill.bill_code_id
        ) billValue
        ON bill_code.id = billValue.bill_code_id
        LEFT JOIN customer ON bill_code.customer_id = customer.id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND YEAR(bill_code.date) = ${year}
        ${month == 0 ? "" : `AND MONTH(bill_code.date) = ${month}`}
        ORDER BY bill_code.date ASC
    `);
  }

  /**
   * Calculate total sales for a month
   * @param month
   * @param year
   * @param mode
   * @returns
   */
  static calculateTotalSales(month: number, year: number, mode: string) {
    switch (mode) {
      case "plain":
        return prisma.$transaction([
          prisma.$queryRaw<any[]>`
            SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, DAY(bill_code.date) AS day
            FROM bill
            JOIN bill_code ON bill.bill_code_id = bill_code.id
            LEFT JOIN (
              SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_confirm = 1
              AND sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
            ) salesReturn
            ON bill.id = salesReturn.bill_id
            WHERE bill_code.is_confirm = 1
            AND bill_code.is_delete = 0
            AND YEAR(bill_code.date) = ${year}
            AND MONTH(bill_code.date) = ${month}
            GROUP BY DAY(bill_code.date)
          `,
          prisma.$queryRaw<any[]>`
            SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, customer.id AS customer_id, COALESCE(customer.name, "Retail customer") AS customer_name
            FROM bill
            JOIN bill_code ON bill.bill_code_id = bill_code.id
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            LEFT JOIN (
              SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_confirm = 1
              AND sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
            ) salesReturn
            ON bill.id = salesReturn.bill_id
            WHERE bill_code.is_confirm = 1
            AND bill_code.is_delete = 0
            AND YEAR(bill_code.date) = ${year}
            AND MONTH(bill_code.date) = ${month}
            GROUP BY bill_code.customer_id
          `,
        ]);
      case "customer":
        return prisma.$queryRaw<any[]>`
          SELECT SUM((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount)) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, customer.id AS customer_id, COALESCE(customer.name, "Retail customer") AS customer_name
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_confirm = 1
            AND sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
          ) salesReturn
          ON bill.id = salesReturn.bill_id
          LEFT JOIN customer ON bill_code.customer_id = customer.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND YEAR(bill_code.date) = ${year}
          AND MONTH(bill_code.date) = ${month}
          GROUP BY bill_code.customer_id
        `;
      case "type":
        return prisma.$queryRaw<any[]>`
          SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, item_type.name AS item_type_name
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN item ON bill.item_id = item.id
          JOIN item_type ON item.item_type_id = item_type.id
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_confirm = 1
            AND sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
          ) salesReturn
          ON bill.id = salesReturn.bill_id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND YEAR(bill_code.date) = ${year}
          AND MONTH(bill_code.date) = ${month}
          GROUP BY item_type.id
        `;
      case "brand":
        return prisma.$queryRaw<any[]>`
          SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, item_brand.name AS item_brand_name
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN item ON bill.item_id = item.id
          JOIN item_brand ON item.item_brand_id = item_brand.id
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_confirm = 1
            AND sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
          ) salesReturn
          ON bill.id = salesReturn.bill_id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0
          AND YEAR(bill_code.date) = ${year}
          AND MONTH(bill_code.date) = ${month}
          GROUP BY item_brand.id
        `;
      case "package":
        return prisma.$queryRaw<any[]>`
          SELECT SUM(bill.quantity - coalesce(salesReturn.quantity, 0)) AS quantity, SUM((bill.quantity - coalesce(salesReturn.quantity, 0)) * (bill.price - bill.discount)) AS value, package_code_id, package_code.name, package_code.description
          FROM bill
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code 
              ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_confirm = 1
              AND sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
          ) AS salesReturn
          ON bill.id = salesReturn.bill_id
          JOIN package_code ON bill.package_code_id = package_code.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          WHERE bill_code.is_confirm = 1
          AND bill_code.is_delete = 0 
          AND YEAR(bill_code.date) = ${year}
          AND MONTH(bill_code.date) = ${month}
          group by bill.package_code_id
          ORDER BY value DESC
        `;
      default:
        return prisma.$queryRawUnsafe<any[]>(`
            SELECT bill_code.date, COALESCE(customer.name, 'Retail customer') AS customer_name,
            bill_code.name, pv.value, bill_code.discount, bill_code.service, bill_code.delivery
            FROM bill_code
            LEFT JOIN customer ON bill_code.customer_id = customer.id
            JOIN (
              SELECT (bill.quantity - COALESCE(sr.quantity, 0)) * (bill.price - bill.discount) AS value, 
              bill.bill_code_id
              FROM bill
              LEFT JOIN (
                SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
                FROM sales_return
                JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
                WHERE sales_return_code.is_confirm = 1
                AND sales_return_code.is_delete = 0
                GROUP BY sales_return.bill_id
              ) sr
              ON bill.id = sr.bill_id
              GROUP BY bill.bill_code_id
            ) pv
            ON bill_code.id = pv.bill_code_id
            WHERE bill_code.is_delete = 0
            AND YEAR(bill_code.date) = ${year}
            AND MONTH(bill_code.date) = ${month}
            ORDER BY bill_code.date ASC
        `);
        break;
      // }
      // if (mode == "plain") {
      // } else if (mode == "customer") {
      // } else if (mode == "type") {

      // } else if (mode == "brand") {

      // } else if (mode == "package") {

      // } else {
      //   return prisma.$transaction([
      //     prisma.$queryRaw<any[]>`
      //   SELECT SUM((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount)) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, customer.id AS customer_id, COALESCE(customer.name, "Retail customer") AS customer_name
      //   FROM bill
      //   JOIN bill_code ON bill.bill_code_id = bill_code.id
      //   LEFT JOIN (
      //     SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
      //     FROM sales_return
      //     JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
      //     WHERE sales_return_code.is_confirm = 1
      //     AND sales_return_code.is_delete = 0
      //     GROUP BY sales_return.bill_id
      //   ) salesReturn
      //   ON bill.id = salesReturn.bill_id
      //   LEFT JOIN customer ON bill_code.customer_id = customer.id
      //   WHERE bill_code.is_confirm = 1
      //   AND bill_code.is_delete = 0
      //   AND YEAR(bill_code.date) = ${year}
      //   AND MONTH(bill_code.date) = ${month}
      //   GROUP BY bill_code.customer_id
      // `,
      //     prisma.$queryRaw<any[]>`
      // SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, item_type.name AS item_type_name
      // FROM bill
      // JOIN bill_code ON bill.bill_code_id = bill_code.id
      // JOIN item ON bill.item_id = item.id
      // JOIN item_type ON item.item_type_id = item_type.id
      // LEFT JOIN (
      //   SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
      //   FROM sales_return
      //   JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
      //   WHERE sales_return_code.is_confirm = 1
      //   AND sales_return_code.is_delete = 0
      //   GROUP BY sales_return.bill_id
      // ) salesReturn
      // ON bill.id = salesReturn.bill_id
      // WHERE bill_code.is_confirm = 1
      // AND bill_code.is_delete = 0
      // AND YEAR(bill_code.date) = ${year}
      // AND MONTH(bill_code.date) = ${month}
      // GROUP BY item_type.id
      // `,
      //     prisma.$queryRaw<any[]>`
      // SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, item_brand.name AS item_brand_name
      // FROM bill
      // JOIN bill_code ON bill.bill_code_id = bill_code.id
      // JOIN item ON bill.item_id = item.id
      // JOIN item_brand ON item.item_brand_id = item_brand.id
      // LEFT JOIN (
      //   SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
      //   FROM sales_return
      //   JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
      //   WHERE sales_return_code.is_confirm = 1
      //   AND sales_return_code.is_delete = 0
      //   GROUP BY sales_return.bill_id
      // ) salesReturn
      // ON bill.id = salesReturn.bill_id
      // WHERE bill_code.is_confirm = 1
      // AND bill_code.is_delete = 0
      // AND YEAR(bill_code.date) = ${year}
      // AND MONTH(bill_code.date) = ${month}
      // GROUP BY item_brand.id
      // `,
      //   ]);
    }
  }

  static countByCustomerIds(customer_ids: number[]) {
    return prisma.bill_code.groupBy({
      by: ["customer_id"],
      where: {
        customer_id: {
          in: customer_ids,
        },
        is_delete: false,
      },
      _count: true,
    });
  }

  countByDate(date: Date) {
    return prisma.bill_code.count({
      where: {
        date: {
          lte: new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            0,
            0,
            0,
            0
          ),
          gte: new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            0,
            0,
            0,
            0
          ),
        },
      },
    });
  }

  static fetchByDate(date: Date = new Date()) {
    return prisma.$queryRaw`
      SELECT (a.delivery + a.value - a.discount + a.service) AS value FROM (SELECT SUM((bill.price - bill.discount) * bill.quantity) AS value, bill_code.delivery, bill_code.discount, bill_code.service
      FROM bill
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${
      date.getMonth() + 1
    } AND DAY(bill_code.date) = ${date.getDate()}) AS a`;
  }

  static fetchMonthlyByDate(date: Date = new Date()) {
    return prisma.$queryRaw`
      SELECT (a.delivery + a.value - a.discount + a.service) AS value FROM (SELECT SUM((bill.price - bill.discount) * bill.quantity) AS value, bill_code.delivery, bill_code.discount, bill_code.service
      FROM bill
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${
      date.getMonth() + 1
    }) AS a`;
  }

  /**
   * Fetch all bill code
   * Used for development purpose only
   * @remarks
   * This method is only used for development purpose
   *
   * @returns
   */
  static fetchAll() {
    return prisma.bill_code.findMany({
      where: {
        is_delete: false,
      },
      include: {
        bill: {
          include: {
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
            package_code: {
              select: {
                package_content: {
                  select: {
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
                  },
                },
              },
            },
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
  }
}

export default BillCodeModel;
