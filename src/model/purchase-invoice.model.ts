import { PrismaClient } from "@prisma/client";
import {
  AnnualArchive,
  ArchiveCount,
  IFetchArchive,
  IFetchPurchaseInvoiceArchive,
  MonthlyArchive,
  PurchaseInvoiceArchive,
  PurchaseInvoiceArchiveV2,
} from "../interface/archive.interface";
import { ICreateGoodReceipt, IGoodReceiptItem } from "./good_receipt.model";

const prisma = new PrismaClient();

export enum CalculatePurchaseMode {
  Plain,
  Supplier,
  Type,
  Brand,
  Sum,
}

export interface ICreatePurchaseInvoice extends ICreateGoodReceipt {
  purchase_invoice: IPurchaseInvoice;
}

export interface IPurchaseInvoice {
  id?: number;
  name: string;
  date: Date;
  discount: number;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  is_confirm?: boolean;
  confirmed_by?: number;
  confirmed_at?: Date;
  faktur?: string;
}

export interface IUpdatePurchaseInvoice {
  id: number;
  purchase_invoice_name: string;
  good_receipt_name: string;
  date: Date;
  discount: number;
  confirmed_by: number;

  good_receipt: IUpdatePurchaseInvoiceItems[];
}

interface IUpdatePurchaseInvoiceItems {
  id: number;
  price: number;
  discount: number;
}

interface IDeletePurchaseInvoice {
  id: number;
  deleted_by: number;
}

export interface IFetchPurchaseReport {
  month: number;
  year: number;
}

export interface IUpdatePurchaseInvoiceGoodReceipt {
  id: number;
  name: string;
  faktur: string;
  date: Date;
  discount: number;
  good_receipt_code: {
    name: string;
    date: Date;
    supplier_id: number;
    company_id: number;
    good_receipt: {
      item_id: number;
      item_unit_id: number | null;
      quantity: number;
      price: number;
      discount: number;
    }[];
  };
}

class PurchaseInvoiceModel {
  /**
   * Create a new purchase invoice
   * @param data
   * @returns
   */
  static create(data: ICreatePurchaseInvoice) {
    return prisma.good_receipt_code.create({
      data: {
        uuid: data.uuid,
        name: data.name,
        date: data.date,
        created_by: data.created_by,
        is_confirm: true,
        is_delete: false,
        confirmed_by: data.created_by,
        confirmed_at: new Date(),
        company_id: data.company_id,
        supplier_id: data.supplier_id,
        purchase_invoice: {
          create: {
            name: data.purchase_invoice.name,
            date: data.purchase_invoice.date,
            faktur: data.purchase_invoice.faktur,
            created_at: new Date(),
            created_by: data.created_by,
            discount: data.purchase_invoice.discount,
            is_paid: false,
            is_confirm: true,
            is_delete: false,
            confirmed_by: data.created_by,
            confirmed_at: new Date(),
          },
        },
        good_receipt: {
          createMany: {
            data: data.good_receipt.map((item: IGoodReceiptItem) => {
              return {
                item_unit_id: item.item_unit_id,
                quantity: item.quantity,
                price: item.price,
                item_id: item.item_id,
                discount: item.discount,
              };
            }),
          },
        },
      },
      include: {
        good_receipt: {
          select: {
            id: true,
            item: {
              select: {
                reference: true,
                description: true,
                unit: true,
                id: true,
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
            discount: true,
          },
        },
        supplier: {
          select: {
            name: true,
          },
        },
        purchase_invoice: {
          select: {
            discount: true,
          },
        },
      },
    });
  }

  /**
   * Fetch purchase invoice by ID
   * @param id
   * @returns
   */
  static fetchByID(id: number) {
    return prisma.purchase_invoice.findUnique({
      where: {
        id: id,
      },
      select: {
        name: true,
        date: true,
        good_receipt_code_id: true,
        good_receipt_code: {
          select: {
            name: true,
            date: true,
            user_good_receipt_code_created_byTouser: {
              select: {
                id: true,
                name: true,
              },
            },
            user_good_receipt_code_confirmed_byTouser: {
              select: {
                id: true,
                name: true,
              },
            },
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
                item: {
                  select: {
                    id: true,
                    reference: true,
                    description: true,
                    unit: true,
                  },
                },
                item_unit_id: true,
                item_unit: {
                  select: {
                    id: true,
                    unit: true,
                    conversion: true,
                    item_price_purchase: {
                      select: {
                        price: true,
                      },
                      where: {
                        is_delete: false,
                      },
                    },
                  },
                },
                quantity: true,
                price: true,
                discount: true,
              },
            },
          },
        },
        created_at: true,
        created_by: true,
        confirmed_at: true,
        is_confirm: true,
        is_delete: true,
        faktur: true,
        discount: true,
        user_purchase_invoice_created_byTouser: {
          select: {
            name: true,
            user_avatar: {
              select: {
                top: true,
                accessories: true,
                clothes: true,
                eyes: true,
                eyebrows: true,
                mouth: true,
                circle: true,
                color: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Return a calculate-purchase mode
   * By string
   * @param mode
   * @returns
   */
  static calculatePurchaseMode(mode: string): CalculatePurchaseMode | null {
    switch (mode) {
      case "plain":
        return CalculatePurchaseMode.Plain;
      case "supplier":
        return CalculatePurchaseMode.Supplier;
      case "type":
        return CalculatePurchaseMode.Type;
      case "brand":
        return CalculatePurchaseMode.Brand;
      case "sum":
        return CalculatePurchaseMode.Sum;
      default:
        return null;
    }
  }

  /**
   * Update purchase invoice
   * Updates the purchase invoice name, faktur, date, and discount
   * @param data
   * @returns
   */
  static update(data: IUpdatePurchaseInvoiceGoodReceipt) {
    return prisma.purchase_invoice.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        faktur: data.faktur,
        date: data.date,
        discount: data.discount,
        good_receipt_code: {
          update: {
            supplier_id: data.good_receipt_code.supplier_id,
            date: data.good_receipt_code.date,
            name: data.good_receipt_code.name,
            company_id: data.good_receipt_code.company_id,
            good_receipt: {
              deleteMany: {},
              createMany: {
                data: data.good_receipt_code.good_receipt,
              },
            },
          },
        },
      },
      include: {
        good_receipt_code: {
          select: {
            name: true,
            id: true,
            date: true,
            supplier_id: true,
            company_id: true,
            supplier: {
              select: {
                name: true,
              },
            },
            created_at: true,
            good_receipt: {
              select: {
                id: true,
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
    });
  }

  /**
   * Calculate total purchase
   * @param month
   * @param year
   * @param mode
   * @param day
   * @returns
   */
  static calculateTotalPurchase(
    month: number,
    year: number,
    mode: CalculatePurchaseMode,
    day: number | null = null
  ) {
    switch (mode) {
      case CalculatePurchaseMode.Plain:
        return prisma.$transaction([
          prisma.$queryRaw<any[]>`
            SELECT SUM(a.value) AS value,  SUM(purchase_invoice.discount) AS discount, DAY(purchase_invoice.date) AS day
            FROM purchase_invoice
            JOIN (
              SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt_code.id
              FROM good_receipt
              JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
              WHERE good_receipt_code.is_delete = 0
              AND good_receipt_code.is_confirm = 1
              GROUP BY good_receipt_code.id
            ) AS a
            ON purchase_invoice.good_receipt_code_id = a.id
            WHERE purchase_invoice.is_confirm = 1
            AND purchase_invoice.is_delete = 0
            AND YEAR(purchase_invoice.date) = ${year}
            AND MONTH(purchase_invoice.date) = ${month}
            GROUP BY DAY(purchase_invoice.date)
          `,
          prisma.$queryRaw<any[]>`
            SELECT SUM(a.value) AS value,  SUM(purchase_invoice.discount) AS discount, supplier.name
            FROM purchase_invoice
            JOIN (
              SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt_code.id
              FROM good_receipt
              JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
              WHERE good_receipt_code.is_delete = 0
              AND good_receipt_code.is_confirm = 1
              GROUP BY good_receipt_code.id
            ) AS a
            ON purchase_invoice.good_receipt_code_id = a.id
            JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
            JOIN supplier ON good_receipt_code.supplier_id = supplier.id
            WHERE purchase_invoice.is_confirm = 1
            AND purchase_invoice.is_delete = 0
            AND YEAR(purchase_invoice.date) = ${year}
            AND MONTH(purchase_invoice.date) = ${month}
            GROUP BY good_receipt_code.supplier_id
          `,
        ]);
      case CalculatePurchaseMode.Supplier:
        return prisma.$queryRaw<any[]>`
          SELECT supplier.name, SUM(a.value) AS value,  SUM(purchase_invoice.discount) AS discount, DAY(purchase_invoice.date) AS day
          FROM purchase_invoice
          JOIN (
            SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt_code.id
            FROM good_receipt
            JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
            WHERE good_receipt_code.is_delete = 0
            AND good_receipt_code.is_confirm = 1
            GROUP BY good_receipt_code.id
          ) AS a
          ON purchase_invoice.good_receipt_code_id = a.id
          JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE purchase_invoice.is_confirm = 1
          AND purchase_invoice.is_delete = 0
          AND YEAR(purchase_invoice.date) = ${year}
          AND MONTH(purchase_invoice.date) = ${month}
          GROUP BY good_receipt_code.supplier_id
        `;
      case CalculatePurchaseMode.Type:
        return prisma.$queryRaw<any[]>`
          SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, item_type.id AS item_type_id, item_type.name AS item_type_name
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          JOIN item ON good_receipt.item_id = item.id
          JOIN item_type ON item.item_type_id = item_type.id
          WHERE good_receipt_code.is_confirm = 1
          AND purchase_invoice.is_confirm = 1
          AND good_receipt_code.is_delete = 0
          AND purchase_invoice.is_delete = 0
          AND YEAR(purchase_invoice.date) = ${year}
          AND MONTH(purchase_invoice.date) = ${month}
          GROUP BY item.item_type_id
        `;
      case CalculatePurchaseMode.Brand:
        return prisma.$queryRawUnsafe<any[]>(`
          SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, item_brand.id AS item_brand_id, item_brand.name AS item_brand_name
          FROM good_receipt
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
          JOIN item ON good_receipt.item_id = item.id
          JOIN item_brand ON item.item_brand_id = item_brand.id
          WHERE good_receipt_code.is_confirm = 1
          AND purchase_invoice.is_confirm = 1
          AND good_receipt_code.is_delete = 0
          AND purchase_invoice.is_delete = 0
          AND YEAR(purchase_invoice.date) = ${year}
          AND MONTH(purchase_invoice.date) = ${month}
          GROUP BY item.item_brand_id
        `);
      case CalculatePurchaseMode.Sum:
        return prisma.$queryRawUnsafe<any[]>(`
          SELECT SUM(goodReceipt.value) AS value, 
          SUM(discount) AS discount, 
          company.id as company_id, company.name
          FROM purchase_invoice
          JOIN (
            SELECT SUM(good_receipt.quantity * 
              (good_receipt.price - good_receipt.discount) * 
              COALESCE(item_unit.conversion, 1)) AS value, 
              good_receipt_code_id, good_receipt_code.company_id
            FROM good_receipt
            LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
            JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
            GROUP BY good_receipt.good_receipt_code_id
          ) goodReceipt
          ON purchase_invoice.good_receipt_code_id = goodReceipt.good_receipt_code_id
          JOIN company ON goodReceipt.company_id = company.id
          WHERE YEAR(purchase_invoice.date) = ${year}
          ${month == 0 ? "" : "AND MONTH(purchase_invoice.date) = " + month}
          ${day == null ? "" : "AND DAY(purchase_invoice.date) = " + day}
          AND purchase_invoice.is_confirm = 1
          AND purchase_invoice.is_delete = 0
          GROUP BY company.id
        `);
    }
  }

  /**
   * Fetch archive years
   * @param mode
   * @returns AnnualArchive[]
   */
  static fetchArchiveYears() {
    return prisma.$queryRaw<AnnualArchive[]>`
      SELECT DISTINCT(YEAR(purchase_invoice.date)) AS year, 
      COUNT(id) AS count
      FROM purchase_invoice
      WHERE purchase_invoice.date IS NOT NULL
      GROUP BY YEAR(purchase_invoice.date)
    `;
  }

  static fetchArchiveYearsV2() {
    return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT YEAR(purchase_invoice.date) AS year, MONTH(purchase_invoice.date) AS month, 
      COUNT(id) AS count
      FROM purchase_invoice
      GROUP BY MONTH(purchase_invoice.date), YEAR(purchase_invoice.date)
      ORDER BY purchase_invoice.date DESC
    `;
  }

  /**
   * Fetch archive by year
   * @param year
   * @param mode
   * @returns MonthlyArchive[]
   */
  static fetchArchiveMonths(year: number) {
    return prisma.$queryRaw<MonthlyArchive[]>`
      SELECT DISTINCT(MONTH(purchase_invoice.date)) AS month, 
      YEAR(purchase_invoice.date) AS year,
      COUNT(id) AS count
      FROM purchase_invoice
      WHERE YEAR(purchase_invoice.date) = ${year}
      AND purchase_invoice.date IS NOT NULL
      GROUP BY MONTH(purchase_invoice.date)
    `;
  }

  /**
   * Fetch archive by year and month
   * @param year
   * @param month
   * @param page
   * @param mode
   * @returns [PurchaseInvoiceArchive[], ArchiveCount]
   */
  static fetchArchive(data: IFetchArchive) {
    switch (data.mode) {
      case 0:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<PurchaseInvoiceArchive[]>(`
          SELECT purchase_invoice.id, purchase_invoice.date, 
          purchase_invoice.name, purchase_invoice.is_delete, 
          company_id AS company_id, company.name AS company_name, 
          supplier.id AS supplier_id, supplier.name AS supplier_name, 
          purchase_invoice.is_confirm
          FROM purchase_invoice
          JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
          JOIN company ON good_receipt_code.company_id = company.id
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE YEAR(purchase_invoice.date) = ${
            data.year
          } AND MONTH(good_receipt_code.date) = ${data.month + 1}
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          ORDER BY good_receipt_code.date ASC
          LIMIT ${data.limit}
          OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
            SELECT COUNT(id) AS count FROM purchase_invoice
            WHERE YEAR(purchase_invoice.date) = ${
              data.year
            } AND MONTH(purchase_invoice.date) = ${data.month + 1}
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          `),
        ]);
      case 1:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<PurchaseInvoiceArchive[]>(`
          SELECT purchase_invoice.id, purchase_invoice.date, 
          purchase_invoice.name, purchase_invoice.is_delete, 
          company_id AS company_id, company.name AS company_name, 
          supplier.id AS supplier_id, supplier.name AS supplier_name,
          purchase_invoice.is_confirm
          FROM purchase_invoice
          JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
          JOIN company ON good_receipt_code.company_id = company.id
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE YEAR(good_receipt_code.date) = ${
            data.year
          } AND MONTH(good_receipt_code.date) = ${data.month + 1}
          AND purchase_invoice.is_delete = 1
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          ORDER BY purchase_invoice.date ASC
          LIMIT ${data.limit}
          OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM purchase_invoice
          WHERE YEAR(purchase_invoice.date) = ${
            data.year
          } AND MONTH(purchase_invoice.date) = ${data.month + 1}
          AND purchase_invoice.is_delete = 1
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
        `),
        ]);
      case 2:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<PurchaseInvoiceArchive[]>(`
          SELECT purchase_invoice.id, purchase_invoice.date, 
          purchase_invoice.name, purchase_invoice.is_delete, 
          company_id AS company_id, company.name AS company_name, 
          supplier.id AS supplier_id, supplier.name AS supplier_name,
          purchase_invoice.is_confirm
          FROM purchase_invoice
          JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
          JOIN company ON good_receipt_code.company_id = company.id
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE YEAR(good_receipt_code.date) = ${
            data.year
          } AND MONTH(good_receipt_code.date) = ${data.month + 1}
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          ORDER BY good_receipt_code.date ASC
          LIMIT ${data.limit}
          OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(`
          SELECT COUNT(id) AS count FROM purchase_invoice
          WHERE YEAR(purchase_invoice.date) = ${
            data.year
          } AND MONTH(purchase_invoice.date) = ${data.month + 1}
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
        `),
        ]);
      case 3:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<PurchaseInvoiceArchive[]>(`
          SELECT purchase_invoice.id, purchase_invoice.date, 
          purchase_invoice.name, purchase_invoice.is_delete, 
          company_id AS company_id, company.name AS company_name, 
          supplier.id AS supplier_id, supplier.name AS supplier_name,
          purchase_invoice.is_confirm
          FROM purchase_invoice
          JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
          JOIN company ON good_receipt_code.company_id = company.id
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE YEAR(purchase_invoice.date) = ${
            data.year
          } AND MONTH(purchase_invoice.date) = ${data.month + 1}
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.is_confirm = 1
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          ORDER BY purchase_invoice.date ASC
          LIMIT ${data.limit}
          OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(
            `
            SELECT COUNT(id) AS count FROM purchase_invoice
            WHERE YEAR(purchase_invoice.date) = ${
              data.year
            } AND MONTH(purchase_invoice.date) = ${data.month + 1}
            AND purchase_invoice.is_delete = 0
            AND purchase_invoice.is_confirm = 1
            AND purchase_invoice.date IS NOT NULL
            AND purchase_invoice.name LIKE '%${data.keyword}%'
          `
          ),
        ]);
      case 4:
        return prisma.$transaction([
          prisma.$queryRawUnsafe<PurchaseInvoiceArchive[]>(`
          SELECT purchase_invoice.id, purchase_invoice.date, 
          purchase_invoice.name, purchase_invoice.is_delete, 
          company_id AS company_id, company.name AS company_name, 
          supplier.id AS supplier_id, supplier.name AS supplier_name, 
          purchase_invoice.is_confirm
          FROM purchase_invoice
          JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
          JOIN company ON good_receipt_code.company_id = company.id
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE YEAR(good_receipt_code.date) = ${
            data.year
          } AND MONTH(good_receipt_code.date) = ${data.month + 1}
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.is_confirm = 0
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          ORDER BY purchase_invoice.date ASC
          LIMIT ${data.limit}
          OFFSET ${data.offset}`),
          prisma.$queryRawUnsafe<ArchiveCount[]>(
            `
            SELECT COUNT(id) AS count FROM purchase_invoice
            WHERE YEAR(purchase_invoice.date) = ${
              data.year
            } AND MONTH(purchase_invoice.date) = ${data.month + 1}
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.is_confirm = 0
          AND purchase_invoice.date IS NOT NULL
          AND purchase_invoice.name LIKE '%${data.keyword}%'
          `
          ),
        ]);
    }
  }

  static fetchArchiveV2(data: IFetchPurchaseInvoiceArchive) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe<PurchaseInvoiceArchiveV2[]>(`
      SELECT purchase_invoice.id, purchase_invoice.date, 
      purchase_invoice.name, purchase_invoice.is_delete, 
      company_id AS company_id, company.name AS company_name, 
      supplier.id AS supplier_id, supplier.name AS supplier_name, 
      purchase_invoice.is_confirm, purchase_invoice.faktur, good_receipt_code.name AS gr_name
      FROM purchase_invoice
      JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
      JOIN company ON good_receipt_code.company_id = company.id
      JOIN supplier ON good_receipt_code.supplier_id = supplier.id
      WHERE YEAR(purchase_invoice.date) = ${
        data.year
      } AND MONTH(good_receipt_code.date) = ${data.month}
      AND purchase_invoice.date IS NOT NULL
      ${
        data.keyword == null || data.keyword == ""
          ? ""
          : `AND purchase_invoice.name LIKE '%${data.keyword}%'
          OR good_receipt_code.name LIKE '%${data.keyword}%'
          OR supplier.name LIKE '%${data.keyword}%'`
      }
      ${
        data.status == 0
          ? ""
          : data.status == 1
          ? "AND purchase_invoice.is_delete = 1"
          : "AND purchase_invoice.is_delete = 0"
      }
      AND purchase_invoice.date BETWEEN '${data.startDate}' AND '${
        data.endDate
      }'
      ORDER BY good_receipt_code.date ASC
      LIMIT ${data.limit}
      OFFSET ${data.offset}`),
      prisma.$queryRawUnsafe<ArchiveCount[]>(`
        SELECT COUNT(id) AS count FROM purchase_invoice
        WHERE YEAR(purchase_invoice.date) = ${
          data.year
        } AND MONTH(purchase_invoice.date) = ${data.month}
      AND purchase_invoice.date IS NOT NULL
      ${
        data.keyword == null || data.keyword == ""
          ? ""
          : `AND purchase_invoice.name LIKE '%${data.keyword}%'
          OR good_receipt_code.name LIKE '%${data.keyword}%'
          OR supplier.name LIKE '%${data.keyword}%'`
      }
      ${
        data.status == 0
          ? ""
          : data.status == 1
          ? "AND purchase_invoice.is_delete = 1"
          : "AND purchase_invoice.is_delete = 0"
      }
      AND purchase_invoice.date BETWEEN '${data.startDate}' AND '${
        data.endDate
      }'
      `),
    ]);
  }

  /**
   * Fetch unconfirmed purchase invoice
   * @param offset
   * @param limit
   * @returns Promise<PurchaseInvoice[]>
   */
  static fetchUnconfirmed(offset: number, limit: number) {
    return prisma.$transaction([
      prisma.purchase_invoice.findMany({
        where: {
          AND: [
            {
              is_confirm: false,
            },
            {
              is_delete: false,
            },
          ],
        },
        select: {
          id: true,
          date: true,
          name: true,
          faktur: true,
          created_at: true,
          user_purchase_invoice_created_byTouser: {
            select: {
              name: true,
              user_avatar: true,
            },
          },
          good_receipt_code: {
            select: {
              name: true,
              date: true,
              supplier: {
                select: {
                  name: true,
                  address: true,
                },
              },
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.purchase_invoice.count({
        where: {
          is_confirm: false,
          is_delete: false,
        },
      }),
    ]);
  }

  /**
   * Confirm purchase invoice by ID
   * @param data
   * @returns
   */
  static confirmByID(data: IUpdatePurchaseInvoice) {
    const transactions: any[] = [];
    for (let x of data.good_receipt) {
      transactions.push(
        prisma.good_receipt.update({
          where: {
            id: x.id,
          },
          data: {
            price: x.price,
            discount: x.discount,
          },
        })
      );
    }

    return prisma.$transaction([
      prisma.purchase_invoice.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.purchase_invoice_name,
          date: data.date,
          discount: data.discount,
          is_confirm: true,
          is_delete: false,
          confirmed_at: new Date(),
          confirmed_by: data.confirmed_by,
        },
        include: {
          good_receipt_code: {
            select: {
              id: true,
              name: true,
              good_receipt: {
                select: {
                  id: true,
                  price: true,
                  discount: true,
                  quantity: true,
                  item_unit: {
                    select: {
                      id: true,
                      unit: true,
                      conversion: true,
                    },
                  },
                  item: {
                    select: {
                      id: true,
                      reference: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.good_receipt_code.updateMany({
        where: {
          purchase_invoice: {
            id: data.id,
          },
        },
        data: {
          name: data.good_receipt_name,
        },
      }),
      ...transactions,
    ]);
  }

  /**
   * Delete purchase invoice by ID
   * Including good receipt code
   * @param id
   * @param confirmed_by
   * @returns
   */
  static deleteByID(data: IDeletePurchaseInvoice) {
    return prisma.$transaction([
      prisma.purchase_invoice.update({
        where: {
          id: data.id,
        },
        data: {
          is_confirm: false,
          is_delete: true,
          confirmed_at: new Date(),
          confirmed_by: data.deleted_by,
        },
        include: {
          good_receipt_code: {
            select: {
              good_receipt: {
                select: {
                  id: true,
                  item_id: true,
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
      }),
      prisma.good_receipt_code.updateMany({
        where: {
          purchase_invoice: {
            id: data.id,
          },
        },
        data: {
          is_confirm: false,
          is_delete: true,
          confirmed_at: new Date(),
          confirmed_by: data.deleted_by,
        },
      }),
    ]);
  }

  static fetchReport(data: IFetchPurchaseReport) {
    return prisma.$transaction([
      prisma.$queryRawUnsafe(`
        SELECT good_receipt_code.name, good_receipt_code.date, 
        purchase_invoice.name AS purchase_invoice_name, 
        purchase_invoice.faktur, purchase_invoice.discount,
        supplier.name AS supplier_name, company.name AS company_name,
        goodReceipt.value
        FROM purchase_invoice
        JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        JOIN company ON good_receipt_code.company_id = company.id
        JOIN (
          SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt_code_id
          FROM good_receipt
          GROUP BY good_receipt_code_id
        ) goodReceipt
        ON good_receipt_code.id = goodReceipt.good_receipt_code_id
        WHERE YEAR(purchase_invoice.date) = ${data.year}
        AND MONTH(purchase_invoice.date) = ${data.month}
        AND purchase_invoice.is_delete = 0
        AND purchase_invoice.is_confirm = 1
      `),
      prisma.$queryRawUnsafe(`
          SELECT item.reference, item.description, good_receipt.quantity, 
          COALESCE(item_unit.unit, item.unit) AS unit, 
          COALESCE(item_unit.conversion, 1) AS conversion, 
          good_receipt.price, 
          IF(item_unit.unit IS NULL, '', item.unit) AS default_unit,
          good_receipt.discount, item_type.name AS item_type_name,
          item_brand.name AS item_brand_name, good_receipt_code.name,
          good_receipt_code.date
          FROM good_receipt
          JOIN item ON good_receipt.item_id = item.id
          LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
          JOIN item_type ON item.item_type_id = item_type.id
          JOIN item_brand ON item.item_brand_id = item_brand.id
          JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          JOIN purchase_invoice ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
          WHERE YEAR(good_receipt_code.date) = ${data.year}
          AND MONTH(good_receipt_code.date) = ${data.month}
          AND purchase_invoice.is_delete = 0
          AND purchase_invoice.is_confirm = 1
      `),
    ]);
  }

  /**
   * Fetch appendix for purchase invoice
   * @param month
   * @param year
   * @returns
   */
  static fetchAppendix(
    month: number,
    year: number,
    date: number | null = null
  ) {
    return prisma.$queryRawUnsafe(`
      SELECT purchase_invoice.name AS purchase_invoice_name, 
      purchase_invoice.date, goodReceipt.value AS value,
      purchase_invoice.discount discount, supplier.name AS supplier_name, 
      company.name AS company_name
      FROM purchase_invoice
      JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
      JOIN (
        SELECT SUM(good_receipt.quantity * good_receipt.price) AS value, good_receipt.good_receipt_code_id
        FROM good_receipt
        GROUP BY good_receipt.good_receipt_code_id
      ) goodReceipt
      ON good_receipt_code.id = goodReceipt.good_receipt_code_id
      JOIN supplier ON good_receipt_code.supplier_id = supplier.id
      JOIN company ON good_receipt_code.company_id = company.id
      WHERE good_receipt_code.is_confirm = 1
      AND good_receipt_code.is_delete = 0
      AND purchase_invoice.is_confirm = 1
      AND purchase_invoice.is_delete = 0
      AND YEAR(purchase_invoice.date) = ${year}
      ${month == 0 ? "" : `AND MONTH(purchase_invoice.date) = ${month}`}
      ${date == null ? "" : `AND DAY(purchase_invoice.date) = ${date}`}
      ORDER BY purchase_invoice.date ASC
    `);
  }

  /**
   * Search for a particular purchase invoice
   * Can be filtered by supplier, company, item, date,
   * keyword, page, and status
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
    let query = `SELECT purchase_invoice.name, purchase_invoice.id, purchase_invoice.date, supplier.name AS supplier_name, company.name AS company_name, purchase_invoice.is_confirm, purchase_invoice.is_delete
      FROM purchase_invoice 
      JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id
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
      conditionalQueries += ` AND purchase_invoice.date BETWEEN '${date[0]}' AND '${date[1]}'`;
    }

    if (keyword != "") {
      conditionalQueries += ` AND purchase_invoice.name LIKE '%${keyword}%'`;
    }

    if (status == 0) {
      conditionalQueries += ` AND purchase_invoice.is_confirm = 1 AND purchase_invoice.is_delete = 0`;
    } else if (status == 1) {
      conditionalQueries += ` AND purchase_invoice.is_delete = 1 AND purchase_invoice.is_confirm = 0`;
    }

    return prisma.$transaction([
      prisma.$queryRawUnsafe<any[]>(
        `${query} ${conditionalQueries} ORDER BY purchase_invoice.date DESC LIMIT 10 OFFSET ${
          (page - 1) * 10
        }`
      ),
      prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(purchase_invoice.id) AS count FROM purchase_invoice JOIN good_receipt_code ON purchase_invoice.good_receipt_code_id = good_receipt_code.id ${conditionalQueries}`
      ),
    ]);
  }

  static fetchByDate(year: number, month: number, day: number | null) {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT (a.value - a.discount) AS value 
      FROM (
        SELECT SUM((good_receipt.price - good_receipt.discount) * good_receipt.quantity) AS value, purchase_invoice.discount
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
        WHERE purchase_invoice.is_confirm = 1
        AND purchase_invoice.is_delete = 0
        AND YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${month}
        ${
          day == null
            ? ""
            : day < 0
            ? "AND DAY(purchase_invoice.date) <= " + Math.abs(day)
            : "AND DAY(purchase_invoice.date) = " + day
        }
      ) AS a`);
  }
}

export default PurchaseInvoiceModel;
