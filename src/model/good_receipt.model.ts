import { Prisma, PrismaClient } from "@prisma/client";
import {
  AnnualArchive,
  ArchiveCount,
  GoodReceiptArchive,
  MonthlyArchive,
} from "../interface/archive.interface";

const prisma = new PrismaClient();

export interface IGoodReceipt {
  id?: number;
  name: string;
  purchase_invoice_name: string;
  date: Date;
  supplier_id: number;
  company_id: number;
  created_by: number;
}

export interface ICreateGoodReceipt extends IGoodReceipt {
  good_receipt: IGoodReceiptItem[];
}

export interface IGoodReceiptItem {
  id?: number;
  good_receipt_id?: number;
  item_id: number;
  item_unit_id: number;
  quantity: number;
  price: number;
  discount: number;
}

class GoodReceiptModel {
  /**
   * Create good receipt
   * Create a good receipt and good receipt items
   * @param name
   * @param date
   * @param created_by
   * @param supplier_id
   * @param company_id
   * @param items
   * @returns
   */
  static create(data: ICreateGoodReceipt) {
    return prisma.good_receipt_code.create({
      data: {
        name: data.name,
        date: data.date,
        created_by: data.created_by,
        created_at: new Date(),
        confirmed_by: data.created_by,
        confirmed_at: new Date(),
        supplier_id: data.supplier_id,
        company_id: data.company_id,
        is_confirm: true,
        good_receipt: {
          createMany: {
            data: data.good_receipt.map((x) => {
              return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                quantity: x.quantity,
                price: x.price,
                discount: x.discount,
              };
            }),
          },
        },
      },
      include: {
        user_good_receipt_code_created_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            name: true,
            id: true,
          },
        },
        company: {
          select: {
            name: true,
            id: true,
          },
        },
        good_receipt: {
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
            quantity: true,
            price: true,
          },
        },
      },
    });
  }

  /**
   * Fetch good receipt by ID
   * @param id
   * @returns
   */
  static fetchByID(id: number | number[]) {
    if (typeof id === "number") {
      return prisma.good_receipt_code.findUnique({
        where: {
          id: id,
        },
        select: {
          name: true,
          date: true,
          user_good_receipt_code_created_byTouser: {
            select: {
              name: true,
            },
          },
          created_at: true,
          user_good_receipt_code_confirmed_byTouser: {
            select: {
              name: true,
            },
          },
          confirmed_at: true,
          is_confirm: true,
          is_delete: true,
          company: {
            select: {
              id: true,
              name: true,
              address: true,
              npwp: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              address: true,
              npwp: true,
            },
          },
          good_receipt: {
            select: {
              id: true,
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
              quantity: true,
            },
          },
          purchase_invoice: {
            select: {
              name: true,
              date: true,
              is_confirm: true,
              is_delete: true,
            },
          },
        },
      });
    } else {
      return prisma.good_receipt.findMany({
        where: {
          id: {
            in: id,
          },
        },
      });
    }
  }

  /**
   * Update good receipt
   * Update a good receipt and good receipt items
   * @param name
   * @param date
   * @param created_by
   * @param supplier_id
   * @param company_id
   * @param items
   */
  static update(data: IGoodReceipt) {
    return prisma.good_receipt_code.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        date: data.date,
        supplier_id: data.supplier_id,
        company_id: data.company_id,
      },
      select: {
        id: true,
        name: true,
        date: true,
        supplier_id: true,
        company_id: true,
        purchase_invoice: {
          select: {
            id: true,
            discount: true,
          },
        },
      },
    });
  }

  static deleteItemsByGoodReceiptCodeId(good_receipt_code_id: number) {
    return prisma.good_receipt.deleteMany({
      where: {
        good_receipt_code_id: good_receipt_code_id,
      },
    });
  }

  static fetchArchiveYears(mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<AnnualArchive[]>`
      SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year, 
      COUNT(id) AS count
      FROM good_receipt_code
      GROUP BY YEAR(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<AnnualArchive[]>`
      SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year, 
      COUNT(id) AS count
      FROM good_receipt_code
      WHERE good_receipt_code.is_delete = 1
      GROUP BY YEAR(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<AnnualArchive[]>`
      SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year, 
      COUNT(id) AS count
      FROM good_receipt_code
      WHERE good_receipt_code.is_delete = 0
      GROUP BY YEAR(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    }
  }

  static fetchArchiveMonths(year: number, mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT DISTINCT(MONTH(good_receipt_code.date)) AS month, 
      ${year} AS year,
      COUNT(id) AS count
      FROM good_receipt_code
      WHERE YEAR(good_receipt_code.date) = ${year}
      GROUP BY MONTH(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT DISTINCT(MONTH(good_receipt_code.date)) AS month,
      ${year} AS year,
      COUNT(id) AS count
      FROM good_receipt_code
      WHERE YEAR(good_receipt_code.date) = ${year}
      AND good_receipt_code.is_delete = 1
      GROUP BY MONTH(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT DISTINCT(MONTH(good_receipt_code.date)) AS month, 
      ${year} AS year,
      COUNT(id) AS count
      FROM good_receipt_code
      WHERE YEAR(good_receipt_code.date) = ${year}
      AND good_receipt_code.is_delete = 0
      GROUP BY MONTH(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
      `;
    }
  }

  /**
   * Fetch archive
   * Fetch good receipt archive
   * @param year
   * @param month
   * @param page
   * @param mode
   * @returns
   */
  static fetchArchive(year: number, month: number, page: number, mode: number) {
    switch (mode) {
      case 0:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<GoodReceiptArchive[]>(`
        SELECT good_receipt_code.id, good_receipt_code.date, 
        good_receipt_code.name, good_receipt_code.is_delete, 
        company_id AS company_id, company.name AS company_name, 
        supplier.id AS supplier_id, supplier.name AS supplier_name, 
        good_receipt_code.is_confirm
        FROM good_receipt_code
        JOIN company ON good_receipt_code.company_id = company.id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
            month + 1
          }
        ORDER BY good_receipt_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
          prisma.$queryRaw<ArchiveCount[]>`
          SELECT COUNT(id) AS count FROM good_receipt_code
          WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
            month + 1
          }
        `,
        ]);
      case 1:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<GoodReceiptArchive[]>(`
        SELECT good_receipt_code.id, good_receipt_code.date, good_receipt_code.name, good_receipt_code.is_delete, company_id AS company_id, company.name AS company_name, supplier.id AS supplier_id, supplier.name AS supplier_name, good_receipt_code.is_confirm
        FROM good_receipt_code
        JOIN company ON good_receipt_code.company_id = company.id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
            month + 1
          }
        AND good_receipt_code.is_delete = 1
        ORDER BY good_receipt_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
          prisma.$queryRaw<ArchiveCount[]>`
          SELECT COUNT(id) AS count 
          FROM good_receipt_code
          WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
            month + 1
          }
        AND good_receipt_code.is_delete = 1
        `,
        ]);
      case 2:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<GoodReceiptArchive[]>(`
        SELECT good_receipt_code.id, good_receipt_code.date, good_receipt_code.name, good_receipt_code.is_delete, company_id AS company_id, company.name AS company_name, supplier.id AS supplier_id, supplier.name AS supplier_name, good_receipt_code.is_confirm
        FROM good_receipt_code
        JOIN company ON good_receipt_code.company_id = company.id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
            month + 1
          }
        AND good_receipt_code.is_delete = 0
        ORDER BY good_receipt_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
          prisma.$queryRaw<ArchiveCount[]>`
          SELECT COUNT(id) AS count FROM good_receipt_code
          WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
            month + 1
          }
        AND good_receipt_code.is_delete = 0
        `,
        ]);
    }
  }

  /**
   * Search for good receipt code
   * It will search for certain suppliers, companies,
   * items, date, keyword, page, and status.
   * Helping users to find a particular good receipt document
   * @param suppliers
   * @param companies
   * @param items
   * @param date
   * @param keyword
   * @param page
   * @param status
   * @returns
   */
  static search(
    suppliers: number[],
    companies: number[],
    items: number[],
    date: any[],
    keyword: string,
    page: number,
    status: number
  ) {
    let query = `SELECT good_receipt_code.name, good_receipt_code.id, good_receipt_code.date, supplier.name AS supplier_name, company.name AS company_name, good_receipt_code.is_confirm, good_receipt_code.is_delete
      FROM good_receipt_code 
      JOIN supplier ON good_receipt_code.supplier_id = supplier.id 
      JOIN company ON good_receipt_code.company_id = company.id`;
    let conditionalQueries = "";
    if (items.length > 0) {
      conditionalQueries += ` JOIN (
        SELECT good_receipt.good_receipt_code_id
        FROM good_receipt
        WHERE good_receipt.item_id IN (${items.join(",")})
        GROUP BY good_receipt.good_receipt_code_id
      ) grCount ON good_receipt_code.id = grCount.good_receipt_code_id`;
    }

    if (suppliers.length > 0) {
      conditionalQueries += ` AND good_receipt_code.supplier_id IN (${suppliers.join(
        ","
      )})`;
    }

    if (companies.length > 0) {
      conditionalQueries += ` AND good_receipt_code.company_id IN (${companies.join(
        ","
      )})`;
    }

    if (date[0] != null && date[1] != null) {
      conditionalQueries += ` AND good_receipt_code.date BETWEEN '${date[0]}' AND '${date[1]}'`;
    }

    if (keyword != "") {
      conditionalQueries += ` AND good_receipt_code.name LIKE '%${keyword}%'`;
    }

    if (status == 0) {
      conditionalQueries += ` AND good_receipt_code.is_confirm = 1 AND good_receipt_code.is_delete = 0`;
    } else if (status == 1) {
      conditionalQueries += ` AND good_receipt_code.is_delete = 1 AND good_receipt_code.is_confirm = 0`;
    }

    return prisma.$transaction([
      prisma.$queryRawUnsafe<any[]>(
        `${query} ${conditionalQueries} ORDER BY good_receipt_code.date DESC LIMIT 10 OFFSET ${
          (page - 1) * 10
        }`
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(good_receipt_code.id) AS count FROM good_receipt_code ${conditionalQueries}`
      ),
    ]);
  }
}

export default GoodReceiptModel;
