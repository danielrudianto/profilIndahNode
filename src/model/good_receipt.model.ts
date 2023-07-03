import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class GoodReceiptModel {
  id?: number;
  name: string;
  date: Date;
  created_by: number;
  created_at: Date;
  is_confirm: boolean = true;
  is_delete: boolean = false;
  confirmed_by: number;
  confirmed_at: Date;
  supplier_id: number;
  company_id: number;

  constructor(
    name: string,
    date: Date,
    created_by: number,
    supplier_id: number,
    company_id: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.date = date;
    this.created_by = created_by;
    this.created_at = new Date();
    this.confirmed_by = created_by;
    this.confirmed_at = new Date();
    this.supplier_id = supplier_id;
    this.company_id = company_id;
  }

  create() {
    return prisma.good_receipt_code.create({
      data: {
        name: this.name,
        date: this.date,
        created_by: this.created_by,
        created_at: this.created_at,
        confirmed_by: this.confirmed_by,
        confirmed_at: this.confirmed_at,
        supplier_id: this.supplier_id,
        company_id: this.company_id,
        is_confirm: this.is_confirm,
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
      },
    });
  }

  update() {
    return prisma.good_receipt_code.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        date: this.date,
        supplier_id: this.supplier_id,
        company_id: this.company_id,
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

  static insertItems(items: any[]) {
    return prisma.good_receipt.createMany({
      data: items,
    });
  }

  static fetchById(id: number) {
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
  }

  static fetchByIds(id: number[]) {
    return prisma.good_receipt.findMany({
      where: {
        id: {
          in: id,
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
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year, COUNT(id) AS count
      FROM good_receipt_code
      GROUP BY YEAR(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year, COUNT(id) AS count
      FROM good_receipt_code
      WHERE good_receipt_code.is_delete = 1
      GROUP BY YEAR(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year, COUNT(id) AS count
      FROM good_receipt_code
      WHERE good_receipt_code.is_delete = 0
      GROUP BY YEAR(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    }
  }

  static fetchArchiveMonths(year: number, mode: number) {
    if (mode == 0) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(good_receipt_code.date)) AS month, COUNT(id) AS count
      FROM good_receipt_code
      WHERE YEAR(good_receipt_code.date) = ${year}
      GROUP BY MONTH(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 1) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(good_receipt_code.date)) AS month, COUNT(id) AS count
      FROM good_receipt_code
      WHERE YEAR(good_receipt_code.date) = ${year}
      AND good_receipt_code.is_delete = 1
      GROUP BY MONTH(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
    `;
    } else if (mode == 2) {
      return prisma.$queryRaw<any[]>`
      SELECT DISTINCT(MONTH(good_receipt_code.date)) AS month, COUNT(id) AS count
      FROM good_receipt_code
      WHERE YEAR(good_receipt_code.date) = ${year}
      AND good_receipt_code.is_delete = 0
      GROUP BY MONTH(good_receipt_code.date)
      ORDER BY good_receipt_code.date ASC
      `;
    }
  }

  static fetchArchive(year: number, month: number, page: number, mode: number) {
    if (mode == 0) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
        SELECT good_receipt_code.id, good_receipt_code.date, good_receipt_code.name, good_receipt_code.is_delete, company_id AS company_id, company.name AS company_name, supplier.id AS supplier_id, supplier.name AS supplier_name, good_receipt_code.is_confirm
        FROM good_receipt_code
        JOIN company ON good_receipt_code.company_id = company.id
        JOIN supplier ON good_receipt_code.supplier_id = supplier.id
        WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
          month + 1
        }
        ORDER BY good_receipt_code.date ASC
        LIMIT 10
        OFFSET ${(page - 1) * 10}`),
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM good_receipt_code
          WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
          month + 1
        }
        `,
      ]);
    } else if (mode == 1) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
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
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM good_receipt_code
          WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
          month + 1
        }
        AND good_receipt_code.is_delete = 1
        `,
      ]);
    } else if (mode == 2) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<any[]>(`
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
        prisma.$queryRaw<any[]>`
          SELECT COUNT(id) AS count FROM good_receipt_code
          WHERE YEAR(good_receipt_code.date) = ${year} AND MONTH(good_receipt_code.date) = ${
          month + 1
        }
        AND good_receipt_code.is_delete = 0
        `,
      ]);
    }
  }

  static countByCompanyIds(company_ids: number[]) {
    return prisma.good_receipt_code.groupBy({
      by: ["company_id"],
      where: {
        company_id: {
          in: company_ids,
        },
        is_delete: false,
      },
      _count: true,
    });
  }

  static countBySupplierIds(supplier_ids: number[]) {
    return prisma.good_receipt_code.groupBy({
      by: ["supplier_id"],
      where: {
        supplier_id: {
          in: supplier_ids,
        },
        is_delete: false,
      },
      _count: true,
    });
  }

  static fetchCodeById(id: number) {
    return prisma.good_receipt.findFirst({
      where: {
        id: id,
      },
      select: {
        good_receipt_code: {
          select: {
            created_at: true,
            name: true,
            date: true,
            user_good_receipt_code_created_byTouser: {
              select: {
                name: true,
              },
            },
            supplier: {
              select: {
                name: true,
                address: true,
                npwp: true,
              },
            },
            good_receipt: {
              select: {
                id: true,
                quantity: true,
                item: {
                  select: {
                    reference: true,
                    description: true,
                    unit: true,
                  },
                },
                price: true,
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

  // improvement needed, create good receipt, good receipt item in one go
  static createGoodReceipt(
    name: string,
    purchase_invoice_name: string,
    date: Date,
    supplier_id: number,
    company_id: number,
    user_id: number,
    good_receipt_items: any[]
  ) {
    return prisma.good_receipt_code.create({
      data: {
        name: name,
        date: date,
        created_by: user_id,
        created_at: new Date(),
        confirmed_by: user_id,
        confirmed_at: new Date(),
        supplier_id: supplier_id,
        company_id: company_id,
        is_confirm: true,
        is_delete: false,
        purchase_invoice: {
          create: {
            name: purchase_invoice_name,
            faktur: null,
            date: date,
            discount: 0,
            created_by: user_id,
            created_at: new Date(),
            is_delete: false,
          },
        },
        good_receipt: {
          createMany: {
            data: good_receipt_items.map((x) => {
              return {
                item_id: x.item_id,
                price: x.price,
                quantity: x.quantity,
                item_unit_id: x.item_unit_id,
              };
            }),
          },
        },
      },
    });
  }
}

export default GoodReceiptModel;
