import { PrismaClient } from "@prisma/client";
import {
  AnnualArchive,
  ArchiveCount,
  IFetchArchive,
  IFetchSalesReturnArchiveV2,
  MonthlyArchive,
  SalesReturnArchive,
  SalesReturnArchiveV2,
} from "../interface/archive.interface";

const prisma = new PrismaClient();

interface ICreateSalesReturn {
  id?: number;
  name: string;
  date: Date;
  created_by: number;
  payment_method_id: number | null;
  sales_return: ICreateSalesReturnItem[];
}

interface ISalesReturnSearchItem {
  item_id: number;
  quantity: number;
  item_unit_id: number | null;
}
interface ISalesReturnSearchPackage {
  package_code_id: number;
  quantity: number;
}

interface ICreateSalesReturnItem {
  bill_id: number;
  quantity: number;
}

class SalesReturnModel {
  /**
   * Create sales return
   * @param data
   * @returns
   */
  static create(data: ICreateSalesReturn) {
    return prisma.sales_return_code.create({
      data: {
        name: data.name,
        date: data.date,
        created_by: data.created_by,
        created_at: new Date(),
        is_confirm: true,
        confirmed_by: data.created_by,
        confirmed_at: new Date(),
        payment_method_id: data.payment_method_id,
        sales_return: {
          create: data.sales_return.map((x) => {
            return {
              bill_id: x.bill_id,
              quantity: x.quantity,
            };
          }),
        },
      },
      include: {
        sales_return: {
          include: {
            bill: {
              select: {
                id: true,
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
                price: true,
                quantity: true,
                discount: true,
                package_code: {
                  select: {
                    package_content: {
                      select: {
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
                        quantity: true,
                      },
                    },
                    price: true,
                  },
                },
                bill_code: {
                  select: {
                    id: true,
                    customer: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Fetch sales return by ID
   * @param mode
   * @returns
   */
  static fetchByID(id: number) {
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
            user_avatar: true,
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
                package_code: {
                  select: {
                    name: true,
                    description: true,
                    package_content: {
                      select: {
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
                        quantity: true,
                      },
                    },
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

  /**
   * Fetch sales return by Bill ID
   * Used for checking if bill is already returned
   * @param billIDs
   * @returns
   */
  static fetchByBillIDs(billIDs: number[]) {
    return prisma.sales_return_code.findMany({
      where: {
        sales_return: {
          some: {
            bill_id: {
              in: billIDs,
            },
          },
        },
        is_delete: false,
      },
    });
  }

  static fetchValueByMonthYear(month: number, year: number) {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT SUM(sales_return.quantity * (bill.price - bill.discount)) AS value, bill.id, bill.bill_code_id
      FROM sales_return
      JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
      JOIN bill ON sales_return.bill_id = bill.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE MONTH(bill_code.date) = ${month} AND YEAR(bill_code.date) = ${year}
      AND bill_code.is_delete = 0
      AND sales_return_code.is_delete = 0
      GROUP BY bill.id
    `);
  }

  /**
   * Delete sales return code by id
   * @param id
   * @param created_by
   * @returns
   */
  static deleteByID(id: number, created_by: number) {
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
      include: {
        sales_return: {
          include: {
            bill: {
              select: {
                id: true,
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
                price: true,
                quantity: true,
                discount: true,
                package_code: {
                  select: {
                    package_content: {
                      select: {
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
                        quantity: true,
                      },
                    },
                    price: true,
                  },
                },
                bill_code: {
                  select: {
                    id: true,
                    date: true,
                    created_at: true,
                    customer: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Fetch sales return code by id
   * @param id
   * @returns sales return code
   */
  static fetchCodeByID(id: number) {
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
                package_code: {
                  select: {
                    package_content: {
                      select: {
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
              },
            },
          },
        },
      },
    });
  }

  /**
   * Search sales return code
   * @param date
   * @param items
   * @param packages
   * @returns  sales return codes
   */
  static fetchSearch(
    date: Date,
    items: ISalesReturnSearchItem[],
    packages: ISalesReturnSearchPackage[]
  ) {
    let mysql_string = "";

    items.forEach((x) => {
      if (x.item_unit_id == null) {
        mysql_string += `
          AND bill_code.id IN (
            SELECT DISTINCT(bill.bill_code_id) AS id
            FROM bill
            LEFT JOIN (
              SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code 
              ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
            ) salesReturn
            ON bill.id = salesReturn.bill_id
            WHERE bill.item_id = ${x.item_id}
            AND bill.item_unit_id IS NULL 
            AND (bill.quantity - COALESCE(salesReturn.quantity, 0)) >= ${x.quantity}
          )`;
      } else {
        mysql_string += `
          AND bill_code.id IN (
            SELECT DISTINCT(bill.bill_code_id) AS id
            FROM bill
            LEFT JOIN (
              SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code 
              ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
            ) salesReturn
            ON bill.id = salesReturn.bill_id
            WHERE bill.item_id = ${x.item_id}
            AND bill.item_unit_id = ${x.item_unit_id}
            AND (bill.quantity - COALESCE(salesReturn.quantity, 0)) >= ${x.quantity}
          )`;
      }
    });

    packages.forEach((x) => {
      mysql_string += `
        AND bill_code.id IN (
          SELECT DISTINCT(bill.bill_code_id) AS id
          FROM bill
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code 
              ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
          ) salesReturn
          ON bill.id = salesReturn.bill_id/*  */
          WHERE bill.package_code_id = ${x.package_code_id}
          AND (bill.quantity - COALESCE(salesReturn.quantity, 0)) >= ${x.quantity}
        )`;
    });

    return prisma.$queryRawUnsafe(`
      SELECT bill_code.id, bill_code.date, bill_code.name,
      COALESCE(customer.name, 'Retail') AS customer_name
      FROM bill_code
      LEFT JOIN customer ON bill_code.customer_id = customer.id
      WHERE DAY(bill_code.date) = ${date.getDate()}
      AND MONTH(bill_code.date) = ${date.getMonth() + 1}
      AND YEAR(bill_code.date) = ${date.getFullYear()}
      ${mysql_string}
    `);
  }

  /**
   * Fetch sales return archive years
   * @param mode
   * @returns sales return archive years and count
   */
  static fetchArchiveYears() {
    return prisma.$queryRaw<AnnualArchive[]>`
      SELECT DISTINCT(YEAR(sales_return_code.date)) AS year, 
      COUNT(id) AS count
      FROM sales_return_code
      WHERE sales_return_code.date IS NOT NULL
      GROUP BY YEAR(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
  }

  static fetchArchiveYearsV2() {
    return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT YEAR(sales_return_code.date) AS year, MONTH(sales_return_code.date) AS month, 
      COUNT(id) AS count
      FROM sales_return_code
      GROUP BY MONTH(sales_return_code.date), YEAR(sales_return_code.date)
      ORDER BY sales_return_code.date DESC
    `;
  }

  /**
   * Fetch sales return archive
   * By year
   * @param year
   * @param month
   * @param page
   * @param mode
   * @returns
   */
  static fetchArchiveMonths(year: number) {
    return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT DISTINCT(MONTH(sales_return_code.date)) AS month,
      YEAR(sales_return_code.date) AS year,
      COUNT(id) AS count
      FROM sales_return_code
      WHERE YEAR(sales_return_code.date) = ${year}
      GROUP BY MONTH(sales_return_code.date)
      ORDER BY sales_return_code.date ASC
    `;
  }

  /**
   * Fetch sales return archive
   * By year, month, and page
   * @param year
   * @param month
   * @param page
   * @param mode
   * @returns
   */
  static fetchArchive(data: IFetchArchive) {
    switch (data.mode) {
      case 0:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<SalesReturnArchive[]>(`
        SELECT sales_return_code.id, sales_return_code.date, 
        sales_return_code.name, sales_return_code.is_delete, 
        customer.id AS customer_id, 
        COALESCE(customer.name, 'Retail customer') AS customer_name, 
        sales_return_code.is_confirm
        FROM sales_return_code
        JOIN (
          SELECT sales_return_code_id, customer_id
          FROM sales_return_code
          JOIN sales_return ON sales_return_code.id = sales_return.sales_return_code_id
          JOIN bill ON sales_return.bill_id = bill.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          GROUP BY sales_return_code.id
        ) salesReturnCount
        ON sales_return_code.id = salesReturnCount.sales_return_code_id
        LEFT JOIN customer ON salesReturnCount.customer_id = customer.id
        WHERE YEAR(sales_return_code.date) = ${
          data.year
        } AND MONTH(sales_return_code.date) = ${data.month + 1}
        ${
          data.keyword == ""
            ? ""
            : `AND sales_return_code.name LIKE '%${data.keyword}%'`
        }
        ORDER BY sales_return_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM sales_return_code
          WHERE YEAR(sales_return_code.date) = ${
            data.year
          } AND MONTH(sales_return_code.date) = ${data.month + 1}
          ${
            data.keyword == ""
              ? ""
              : `AND sales_return_code.name LIKE '%${data.keyword}%'`
          }
        `),
        ]);
      case 1:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<SalesReturnArchive[]>(`
        SELECT sales_return_code.id, sales_return_code.date, 
        sales_return_code.name, sales_return_code.is_delete, 
        customer.id AS customer_id, 
        COALESCE(customer.name, 'Retail customer') AS customer_name, 
        sales_return_code.is_confirm
        FROM sales_return_code
        JOIN (
          SELECT sales_return_code_id, customer_id
          FROM sales_return_code
          JOIN sales_return ON sales_return_code.id = sales_return.sales_return_code_id
          JOIN bill ON sales_return.bill_id = bill.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          GROUP BY sales_return_code.id
        ) salesReturnCount
        ON sales_return_code.id = salesReturnCount.sales_return_code_id
        LEFT JOIN customer ON salesReturnCount.customer_id = customer.id
        WHERE YEAR(sales_return_code.date) = ${
          data.year
        } AND MONTH(sales_return_code.date) = ${data.month + 1}
        AND sales_return_code.is_delete = 1
        ${
          data.keyword == ""
            ? ""
            : `AND sales_return_code.name LIKE '%${data.keyword}%'`
        }
        ORDER BY sales_return_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM sales_return_code
          WHERE YEAR(sales_return_code.date) = ${
            data.year
          } AND MONTH(sales_return_code.date) = ${data.month + 1}
          AND sales_return_code.is_delete = 1
          ${
            data.keyword == ""
              ? ""
              : `AND sales_return_code.name LIKE '%${data.keyword}%'`
          }
        `),
        ]);
      case 2:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<SalesReturnArchive[]>(`
        SELECT sales_return_code.id, sales_return_code.date, 
        sales_return_code.name, sales_return_code.is_delete, 
        customer.id AS customer_id, 
        COALESCE(customer.name, 'Retail customer') AS customer_name, 
        sales_return_code.is_confirm
        FROM sales_return_code
        JOIN (
          SELECT sales_return_code_id, customer_id
          FROM sales_return_code
          JOIN sales_return ON sales_return_code.id = sales_return.sales_return_code_id
          JOIN bill ON sales_return.bill_id = bill.id
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          GROUP BY sales_return_code.id
        ) salesReturnCount
        ON sales_return_code.id = salesReturnCount.sales_return_code_id
        LEFT JOIN customer ON salesReturnCount.customer_id = customer.id
        WHERE YEAR(sales_return_code.date) = ${
          data.year
        } AND MONTH(sales_return_code.date) = ${data.month + 1}
        AND sales_return_code.is_delete = 0
        ${
          data.keyword == ""
            ? ""
            : `AND sales_return_code.name LIKE '%${data.keyword}%'`
        }
        ORDER BY sales_return_code.date ASC
        LIMIT ${data.limit}
        OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM sales_return_code
          WHERE YEAR(sales_return_code.date) = ${
            data.year
          } AND MONTH(sales_return_code.date) = ${data.month + 1}
        AND sales_return_code.is_delete = 0
        ${
          data.keyword == ""
            ? ""
            : `AND sales_return_code.name LIKE '%${data.keyword}%'`
        }
        `),
        ]);
    }
  }

  static fetchArchiveV2(data: IFetchSalesReturnArchiveV2) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<SalesReturnArchiveV2[]>(`
      SELECT sales_return_code.id, sales_return_code.date, 
      sales_return_code.name, sales_return_code.is_delete,  
      sales_return_code.is_confirm
      FROM sales_return_code
      WHERE YEAR(sales_return_code.date) = ${
        data.year
      } AND MONTH(sales_return_code.date) = ${data.month}
      ${
        data.keyword == null || data.keyword == ""
          ? ""
          : `AND sales_return_code.name LIKE '%${data.keyword}%'`
      }
      ${
        data.status == 0
          ? ""
          : data.status == 1
          ? "AND sales_return_code.is_delete = 1"
          : "AND sales_return_code.is_delete = 0"
      }
      AND sales_return_code.date BETWEEN '${data.startDate}' AND '${
        data.endDate
      }'
      ORDER BY sales_return_code.date ASC
      LIMIT ${data.limit}
      OFFSET ${data.offset}`),
      prisma.$queryRawUnsafe<ArchiveCount[]>(`
        SELECT COUNT(id) AS count 
        FROM sales_return_code
        WHERE YEAR(sales_return_code.date) = ${
          data.year
        } AND MONTH(sales_return_code.date) = ${data.month}
      ${
        data.keyword == null || data.keyword == ""
          ? ""
          : `AND sales_return_code.name LIKE '%${data.keyword}%'`
      }
      ${
        data.status == 0
          ? ""
          : data.status == 1
          ? "AND sales_return_code.is_delete = 1"
          : "AND sales_return_code.is_delete = 0"
      }
      AND sales_return_code.date BETWEEN '${data.startDate}' AND '${
        data.endDate
      }'
      `),
    ]);
  }

  /**
   * Fetch all sales return code
   * Used for development purpose only
   * @remarks
   * This method is only used for development purpose
   *
   * @returns
   */
  static fetchAll() {
    return prisma.sales_return_code.findMany({
      where: {
        is_delete: false,
      },
      select: {
        id: true,
        name: true,
        date: true,
        created_at: true,
        sales_return: {
          select: {
            id: true,
            quantity: true,
            bill: {
              select: {
                id: true,
                bill_code_id: true,
                bill_code: {
                  select: {
                    customer: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
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
                        quantity: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}

export default SalesReturnModel;
