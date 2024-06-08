import { prisma } from "../app";
import {
  ArchiveCount,
  IFetchArchive,
  AnnualArchive,
  MonthlyArchive,
} from "../interface/archive.interface";

interface ICreateDeposit {
  name: string;
  customer_id: number | null;
  created_by: number;
  discount: number;
  delivery: number;
  service: number;
  date: Date;
  uuid: string;
  items: ICreateDepositItem[];
  payments: ICreateDepositPayment[];
  type: string;
  sales: string | null;
}

interface ICreateDepositItem {
  package_code_id: number | null;
  item_id: number | null;
  item_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
}

interface ICreateDepositPayment {
  bill_code_id?: number;
  payment_method_id: number | null;
  value: number;
  date: Date;
}

interface IDepositArchive {
  id: number;
  date: Date;
  name: string;
  customer_name: string;
  customer_id: number | null;
  value: number;
  payment: number;
}

interface IUpdateDeposit {
  id: number;
}

interface IUpdateDepositItem {
  id: number;
  checked: boolean;
}

interface IUpdateDepositPayment {
  id: number;
  amount: number;
  usedAmount: number;
  date: string;
}

interface IUpdateDepositBillPayment {
  id: number;
  amount: number;
  date: string;
}

class DepositModel {
  /**
   * Generate bill code name based on date
   * @param date
   * @returns string
   */
  static generateName(date: Date = new Date()) {
    return `DPS-${date.getFullYear()}-${Math.floor(
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
   * Create new deposit
   * @param data
   * @returns
   */
  static create(data: ICreateDeposit) {
    return prisma.deposit_code.create({
      data: {
        name: data.name,
        customer_id: data.customer_id,
        created_by: data.created_by,
        discount: data.discount,
        delivery: data.delivery,
        service: data.service,
        date: data.date,
        uuid: data.uuid,
        deposit: {
          createMany: {
            data: data.items,
          },
        },
        deposit_payment: {
          create: data.payments,
        },
        type: data.type,
        sales: data.sales,
      },
    });
  }

  /**
   * Count current active deposit
   */

  static countActive() {
    return prisma.deposit_code.count({
      where: {
        is_delete: false,
      },
    });
  }

  /**
   * Fetch deposit detail by ID
   */
  static fetchByID(id: number) {
    return prisma.deposit_code.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        customer_id: true,
        name: true,
        date: true,
        discount: true,
        delivery: true,
        service: true,
        type: true,
        sales: true,
        deposit: {
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
            package_code_id: true,
            package_code: {
              select: {
                id: true,
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
        deposit_payment: {
          select: {
            id: true,
            value: true,
            date: true,
            payment_method_id: true,
            payment_method: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
        user_bill_code_created_byTouser: {
          select: {
            name: true,
          },
        },
        is_delete: true,
        created_at: true,
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
   * Fetch deposit
   */
  static fetch(keyword: string, page: number) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<IDepositArchive[]>(`
        SELECT deposit_code.id, deposit_code.date, deposit_code.name,
        IF(deposit_code.type = 'INTERNAL', 'Internal', COALESCE(customer.name, 'Retail customer')) AS customer_name, 
        COALESCE(deposit_code.sales, 'INTERNAL') AS sales,
        deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment,
        deposit_code.type
        FROM deposit_code
        LEFT JOIN customer ON deposit_code.customer_id = customer.id
        LEFT JOIN (
            SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
            deposit.deposit_code_id
            FROM deposit
            WHERE deposit.is_delete = 0
            GROUP BY deposit.deposit_code_id
        ) AS b
        ON deposit_code.id = b.deposit_code_id
        LEFT JOIN (
            SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
            FROM deposit_payment
            GROUP BY deposit_payment.deposit_code_id
        ) AS pm
        ON pm.deposit_code_id = deposit_code.id
        WHERE deposit_code.is_delete = 0 
        AND (deposit_code.name LIKE '%${keyword}%'
        OR COALESCE(customer.name, 'Retail customer') LIKE '%${keyword}%')
        ORDER BY date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}
    `),
      prisma.deposit_code.count({
        where: {
          is_delete: false,
        },
      }),
    ]);
  }

  static fetchV2(id: number[], page: number) {
    if (id.length == 0) return Promise.resolve([]);

    return prisma.$queryRawUnsafe<IDepositArchive[]>(`
      SELECT deposit_code.id, deposit_code.date, deposit_code.name,
      IF(deposit_code.type = 'INTERNAL', 'Internal', COALESCE(customer.name, 'Retail customer')) AS customer_name, 
      COALESCE(deposit_code.sales, 'INTERNAL') AS sales,
      deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment,
      deposit_code.type
      FROM deposit_code
      LEFT JOIN customer ON deposit_code.customer_id = customer.id
      LEFT JOIN (
          SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
          deposit.deposit_code_id
          FROM deposit
          WHERE deposit.is_delete = 0
          AND deposit.deposit_code_id IN (${id.join(",")})
          GROUP BY deposit.deposit_code_id
      ) AS b
      ON deposit_code.id = b.deposit_code_id
      LEFT JOIN (
          SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
          FROM deposit_payment
          WHERE deposit_payment.deposit_code_id IN (${id.join(",")})
          GROUP BY deposit_payment.deposit_code_id
      ) AS pm
      ON pm.deposit_code_id = deposit_code.id
      WHERE deposit_code.is_delete = 0 
      AND deposit_code.id IN (${id.join(",")})
      ORDER BY date ASC
      LIMIT 20
      OFFSET ${(page - 1) * 20}
    `);
  }

  static fetchIdsV2(keyword: string) {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT DISTINCT(deposit_code.id) AS id
      FROM deposit
      JOIN deposit_code ON deposit.deposit_code_id = deposit_code.id
      JOIN item ON deposit.item_id = item.id
      LEFT JOIN customer ON deposit_code.customer_id = customer.id
      WHERE deposit_code.is_delete = 0
      AND (
        deposit_code.name LIKE '%${keyword}%'
        OR COALESCE(customer.name, 'Retail customer') LIKE '%${keyword}%'
        OR item.reference LIKE '%${keyword}%'
        OR item.description LIKE '%${keyword}%'
        OR deposit_code.sales LIKE '%${keyword}%'
      )
      ORDER BY date ASC
    `);
  }

  /**
   * Fetch bill code and group them by year
   * @param mode
   * @returns AnnualArchive[]
   */
  static fetchArchiveYears(mode: number) {
    switch (mode) {
      case 1:
        return prisma.$queryRaw<AnnualArchive[]>`
            SELECT DISTINCT(YEAR(deposit_code.date)) AS year, COUNT(id) AS count
            FROM deposit_code
            WHERE deposit_code.is_delete = 1
            GROUP BY YEAR(deposit_code.date)
        `;
      case 2:
        return prisma.$queryRaw<AnnualArchive[]>`
            SELECT DISTINCT(YEAR(deposit_code.date)) AS year, COUNT(id) AS count
            FROM deposit_code
            WHERE deposit_code.is_delete = 0
            GROUP BY YEAR(deposit_code.date)
        `;
      case 0:
      default:
        return prisma.$queryRaw<AnnualArchive[]>`
            SELECT DISTINCT(YEAR(deposit_code.date)) AS year, COUNT(id) AS count
            FROM deposit_code
            GROUP BY YEAR(deposit_code.date)
        `;
    }
  }

  /**
   * Fetch monthly archive
   * @param year
   * @returns  MonthlyArchive[]
   */
  static fetchArchiveMonths(year: number, mode: number) {
    switch (mode) {
      case 1:
        return prisma.$queryRaw<MonthlyArchive[]>`
            SELECT DISTINCT(MONTH(deposit_code.date)) AS month, 
            YEAR(deposit_code.date) AS year,
            COUNT(id) AS count
            FROM deposit_code
            WHERE YEAR(deposit_code.date) = ${year}
            AND deposit_code.is_delete = 1
            GROUP BY MONTH(deposit_code.date)
        `;
        break;
      case 2:
        return prisma.$queryRaw<MonthlyArchive[]>`
            SELECT DISTINCT(MONTH(deposit_code.date)) AS month, 
            YEAR(deposit_code.date) AS year,
            COUNT(id) AS count
            FROM deposit_code
            WHERE YEAR(deposit_code.date) = ${year}
            AND deposit_code.is_delete = 0
            GROUP BY MONTH(deposit_code.date)
        `;
        break;
      case 0:
      default:
        return prisma.$queryRaw<MonthlyArchive[]>`
            SELECT DISTINCT(MONTH(deposit_code.date)) AS month, 
            YEAR(deposit_code.date) AS year,
            COUNT(id) AS count
            FROM deposit_code
            WHERE YEAR(deposit_code.date) = ${year}
            GROUP BY MONTH(deposit_code.date)
        `;
        break;
    }
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
          prisma.$queryRawUnsafe<IDepositArchive[]>(`
            SELECT deposit_code.id, deposit_code.date, deposit_code.name,
            COALESCE(customer.name, 'Retail customer') AS customer_name, 
            deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment
            FROM deposit_code
            LEFT JOIN customer ON deposit_code.customer_id = customer.id
            LEFT JOIN (
                SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
                deposit.deposit_code_id
                FROM deposit
                GROUP BY deposit.deposit_code_id
            ) AS b
            ON deposit_code.id = b.deposit_code_id
            LEFT JOIN (
                SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
                FROM deposit_payment
                GROUP BY deposit_payment.deposit_code_id
            ) AS pm
            ON pm.deposit_code_id = deposit_code.id
            WHERE YEAR(deposit_code.date) = ${
              data.year
            } AND MONTH(deposit_code.date) = ${data.month + 1}
            ${
              data.keyword == null
                ? ""
                : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`
            }
            ORDER BY date ASC
            LIMIT ${data.limit}
            OFFSET ${data.offset}
          `),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
            SELECT COUNT(deposit_code.id) AS count 
            FROM deposit_code
            LEFT JOIN customer ON deposit_code.customer_id = customer.id
            WHERE YEAR(deposit_code.date) = ${
              data.year
            } AND MONTH(deposit_code.date) = ${data.month + 1}
            ${
              data.keyword == null
                ? ""
                : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                OR COALESCE(customer.name, 'Retail customer') 
                LIKE '%${data.keyword}%')`
            }
          `),
        ]);
      case 1:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<IDepositArchive[]>(`
              SELECT deposit_code.id, deposit_code.date, deposit_code.name,
              COALESCE(customer.name, 'Retail customer') AS customer_name, 
              deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment
              FROM deposit_code
              LEFT JOIN customer ON deposit_code.customer_id = customer.id
              LEFT JOIN (
                  SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
                  deposit.deposit_code_id
                  FROM deposit
                  GROUP BY deposit.deposit_code_id
              ) AS b
              ON deposit_code.id = b.deposit_code_id
              LEFT JOIN (
                  SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
                  FROM deposit_payment
                  GROUP BY deposit_payment.deposit_code_id
              ) AS pm
              ON pm.deposit_code_id = deposit_code.id
              WHERE YEAR(deposit_code.date) = ${
                data.year
              } AND MONTH(deposit_code.date) = ${data.month + 1}
              AND deposit_code.is_delete = 1
              ${
                data.keyword == null
                  ? ""
                  : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                  OR COALESCE(customer.name, 'Retail customer') 
                  LIKE '%${data.keyword}%')`
              }
              ORDER BY date ASC
              LIMIT ${data.limit}
              OFFSET ${data.offset}
            `),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
              SELECT COUNT(deposit_code.id) AS count 
              FROM deposit_code
              LEFT JOIN customer ON deposit_code.customer_id = customer.id
              WHERE YEAR(deposit_code.date) = ${
                data.year
              } AND deposit_code.is_delete = 1
              AND MONTH(deposit_code.date) = ${data.month + 1}
              ${
                data.keyword == null
                  ? ""
                  : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                  OR COALESCE(customer.name, 'Retail customer') 
                  LIKE '%${data.keyword}%')`
              }
            `),
        ]);
      case 2:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<IDepositArchive[]>(`
                SELECT deposit_code.id, deposit_code.date, deposit_code.name,
                COALESCE(customer.name, 'Retail customer') AS customer_name, 
                deposit_code.customer_id, b.value, COALESCE(pm.value, 0) AS payment
                FROM deposit_code
                LEFT JOIN customer ON deposit_code.customer_id = customer.id
                LEFT JOIN (
                    SELECT SUM(deposit.quantity * (deposit.price - deposit.discount)) AS value,
                    deposit.deposit_code_id
                    FROM deposit
                    GROUP BY deposit.deposit_code_id
                ) AS b
                ON deposit_code.id = b.deposit_code_id
                LEFT JOIN (
                    SELECT SUM(deposit_payment.value) AS value, deposit_payment.deposit_code_id
                    FROM deposit_payment
                    GROUP BY deposit_payment.deposit_code_id
                ) AS pm
                ON pm.deposit_code_id = deposit_code.id
                WHERE YEAR(deposit_code.date) = ${
                  data.year
                } AND MONTH(deposit_code.date) = ${data.month + 1}
                AND deposit_code.is_delete = 0
                ${
                  data.keyword == null
                    ? ""
                    : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                    OR COALESCE(customer.name, 'Retail customer') 
                    LIKE '%${data.keyword}%')`
                }
                ORDER BY date ASC
                LIMIT ${data.limit}
                OFFSET ${data.offset}
              `),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
                SELECT COUNT(deposit_code.id) AS count 
                FROM deposit_code
                LEFT JOIN customer ON deposit_code.customer_id = customer.id
                WHERE YEAR(deposit_code.date) = ${
                  data.year
                } AND deposit_code.is_delete = 0
                AND MONTH(deposit_code.date) = ${data.month + 1}
                ${
                  data.keyword == null
                    ? ""
                    : `AND (deposit_code.name LIKE '%${data.keyword}%' 
                    OR COALESCE(customer.name, 'Retail customer') 
                    LIKE '%${data.keyword}%')`
                }
              `),
        ]);
    }
  }

  static confirmByID(data: IUpdateDeposit) {
    return prisma.deposit_code.update({
      where: {
        id: data.id,
      },
      data: {
        is_delete: true,
        deposit: {
          updateMany: {
            data: {
              is_delete: true,
            },
            where: {
              is_delete: false,
            },
          },
        },
      },
    });
  }

  static deleteByID(id: number) {
    return prisma.deposit_code.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deposit: {
          updateMany: {
            data: {
              is_delete: true,
            },
            where: {
              is_delete: false,
            },
          },
        },
      },
    });
  }

  static fetchByItemIDs(itemIDs: number[]) {
    if (itemIDs.length == 0) return Promise.resolve([]);

    return prisma.$queryRawUnsafe<any[]>(`
      SELECT SUM(deposit.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, deposit.item_id
      FROM deposit
      JOIN deposit_code ON deposit.deposit_code_id = deposit_code.id
      LEFT JOIN item_unit ON deposit.item_unit_id = item_unit.id
      WHERE deposit.item_id IN (${itemIDs.join(",")})
      AND deposit_code.is_delete = 0
      GROUP BY deposit.item_id
      UNION ALL
      SELECT SUM(package_content.quantity * deposit.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, package_content.item_id
      FROM deposit
      JOIN deposit_code ON deposit.deposit_code_id = deposit_code.id
      JOIN package_code ON deposit.package_code_id = package_code.id
      JOIN package_content ON package_code.id = package_content.package_code_id
      LEFT JOIN item_unit ON deposit.item_unit_id = item_unit.id
      WHERE package_content.item_id IN (${itemIDs.join(",")})
      AND deposit_code.is_delete = 0
      GROUP BY package_content.item_id
    `);
  }

  static fetchByItemID(itemID: number) {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT SUM(deposit.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, deposit.item_id
      FROM deposit
      JOIN deposit_code ON deposit.deposit_code_id = deposit_code.id
      LEFT JOIN item_unit ON deposit.item_unit_id = item_unit.id
      WHERE deposit.item_id = ${itemID}
      AND deposit_code.is_delete = 0
      UNION ALL
      SELECT SUM(package_content.quantity * deposit.quantity * COALESCE(item_unit.conversion, 1)) AS quantity, package_content.item_id
      FROM deposit
      JOIN deposit_code ON deposit.deposit_code_id = deposit_code.id
      JOIN package_code ON deposit.package_code_id = package_code.id
      JOIN package_content ON package_code.id = package_content.package_code_id
      LEFT JOIN item_unit ON deposit.item_unit_id = item_unit.id
      WHERE package_content.item_id = ${itemID}
      AND deposit_code.is_delete = 0
      GROUP BY package_content.item_id
    `);
  }
}

export default DepositModel;
