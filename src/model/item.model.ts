import { PrismaClient } from "@prisma/client";
import { join } from "@prisma/client/runtime";

const prisma = new PrismaClient();

export class ItemModel {
  id?: number;
  reference: string;
  description: string;
  brand_id: number;
  brand?: string;
  minimum_stock: number;
  created_by: number;
  created_at?: Date;

  constructor(
    reference: string,
    description: string,
    minimum_stock: number,
    brand_id: number,
    created_by: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.reference = reference;
    this.description = description;
    this.minimum_stock = minimum_stock;
    this.brand_id = brand_id;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.item.create({
      data: {
        reference: this.reference,
        description: this.description,
        item_brand_id: this.brand_id,
        created_by: this.created_by,
        created_at: this.created_at,
        minimum_stock: this.minimum_stock,
      },
      select: {
        id: true,
        reference: true,
        description: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_brand_id: true,
        created_by: true,
        user: {
          select: {
            name: true,
          },
        },
        created_at: true,
        minimum_stock: true,
      },
    });
  }

  update() {
    return prisma.item.update({
      where: {
        id: this.id,
      },
      data: {
        reference: this.reference,
        description: this.description,
        item_brand_id: this.brand_id,
        updated_by: this.created_by,
        updated_at: this.created_at,
        minimum_stock: this.minimum_stock,
      },
      select: {
        id: true,
        reference: true,
        description: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_brand_id: true,
        created_by: true,
        user: {
          select: {
            name: true,
          },
        },
        created_at: true,
        minimum_stock: true,
        updated_at: true,
        user_item_updated_byTouser: {
          select: {
            name: true,
          },
        },
        updated_by: true,
      },
    });
  }

  static fetchById(id: number, date: Date) {
    return prisma.item.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        reference: true,
        description: true,
        is_delete: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_price: {
          select: {
            price: true,
            discount: true,
            discount_project: true,
            created_at: true,
            effective_date: true,
          },
          where: {
            is_delete: false,
            effective_date: {
              lte: date,
            },
          },
          orderBy: [
            {
              effective_date: "desc",
            },
            {
              id: "desc",
            },
          ],
          take: 1,
          skip: 0,
        },
        stock: {
          select: {
            stock: true,
          },
        },
      },
    });
  }

  static fetchByIds(id: number[]) {
    return prisma.item.findMany({
      where: {
        id: {
          in: id,
        },
      },
      select: {
        reference: true,
        description: true,
        id: true,
        stock: {
          select: {
            stock: true,
          },
        },
        minimum_stock: true,
        item_brand: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static fetchByReference(reference: string) {
    return prisma.item.findFirst({
      where: {
        reference: reference,
        is_delete: false,
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        item_brand: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            bill: true,
            good_receipt: true,
          },
        },
        stock: {
          select: {
            stock: true,
          },
        },
      },
    });
  }

  static fetchByReferences(references: string[]) {
    return prisma.item.findMany({
      where: {
        reference: {
          in: references,
        },
        is_delete: false,
      },
      select: {
        id: true,
        reference: true,
      },
    });
  }

  static fetch(keyword: string, date: Date, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.item.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            reference: "asc",
          },
          skip: offset,
          take: limit,
          include: {
            user: {
              select: {
                name: true,
              },
            },
            item_brand: {
              select: {
                name: true,
              },
            },
            item_price_purchase: {
              select: {
                price: true,
              },
              orderBy: {
                id: "desc",
              },
              where: {
                is_delete: false,
              },
              take: 1,
              skip: 0,
            },
            item_price: {
              select: {
                price: true,
                discount: true,
                discount_project: true,
              },
              where: {
                effective_date: {
                  lte: date,
                },
                is_delete: false,
              },
              orderBy: [
                {
                  effective_date: "desc",
                },
                {
                  id: "desc",
                },
              ],
              take: 1,
              skip: 0,
            },
            stock: {
              select: {
                stock: true,
              },
            },
          },
        }),
        prisma.item.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.item.findMany({
          where: {
            is_delete: false,
            OR: [
              {
                reference: {
                  contains: keyword,
                },
              },
              {
                description: {
                  contains: keyword,
                },
              },
            ],
          },
          orderBy: {
            reference: "asc",
          },
          skip: offset,
          take: limit,
          include: {
            user: {
              select: {
                name: true,
              },
            },
            item_brand: {
              select: {
                name: true,
              },
            },
            item_price_purchase: {
              select: {
                price: true,
              },
              orderBy: {
                id: "desc",
              },
              where: {
                is_delete: false,
              },
              take: 1,
              skip: 0,
            },
            item_price: {
              select: {
                price: true,
                discount: true,
                discount_project: true,
              },
              where: {
                effective_date: {
                  lte: date,
                },
                is_delete: false,
              },
              orderBy: [
                {
                  effective_date: "desc",
                },
                {
                  id: "desc",
                },
              ],
              take: 1,
              skip: 0,
            },
            stock: {
              select: {
                stock: true,
              },
            },
          },
        }),
        prisma.item.count({
          where: {
            is_delete: false,
            OR: [
              {
                reference: {
                  contains: keyword,
                },
              },
              {
                description: {
                  contains: keyword,
                },
              },
            ],
          },
        }),
      ]);
    }
  }

  static fetchInsufficient(
    keyword: string,
    blocked_brand: string[] = [],
    offset: number,
    limit: number
  ) {
    if (blocked_brand.length > 0) {
      if (keyword == "") {
        return prisma.$transaction([
          prisma.$queryRaw`SELECT item.id FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock AND item.item_brand_id NOT IN (${join(
            blocked_brand
          )}) AND item.is_delete = 0 ORDER BY reference ASC LIMIT ${limit} OFFSET ${offset}`,
          prisma.$queryRaw`SELECT COUNT(item.id) AS count FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock AND item.item_brand_id NOT IN (${join(
            blocked_brand
          )}) AND item.is_delete = 0`,
        ]);
      } else {
        return prisma.$transaction([
          prisma.$queryRaw`SELECT item.id FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock AND (INSTR(item.reference, ${keyword}) OR INSTR(item.description, ${keyword})) AND item.item_brand_id NOT IN (${join(
            blocked_brand
          )}) AND item.is_delete = 0 ORDER BY reference ASC LIMIT ${limit} OFFSET ${offset}`,
          prisma.$queryRaw`SELECT COUNT(item.id) AS count FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock AND (INSTR(item.reference, ${keyword}) OR INSTR(item.description, ${keyword})) AND item.item_brand_id NOT IN (${join(
            blocked_brand
          )}) AND item.is_delete = 0`,
        ]);
      }
    } else {
      if (keyword == "") {
        return prisma.$transaction([
          prisma.$queryRaw`SELECT item.id FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock ORDER BY reference ASC LIMIT ${limit} OFFSET ${offset}`,
          prisma.$queryRaw`SELECT COUNT(item.id) AS count FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock`,
        ]);
      } else {
        return prisma.$transaction([
          prisma.$queryRaw`SELECT item.id FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock AND (INSTR(item.reference, ${keyword}) OR INSTR(item.description, ${keyword})) ORDER BY reference ASC LIMIT ${limit} OFFSET ${offset}`,
          prisma.$queryRaw`SELECT COUNT(item.id) AS count FROM item LEFT JOIN stock ON item.id = stock.id WHERE stock.stock < item.minimum_stock AND (INSTR(item.reference, ${keyword}) OR INSTR(item.description, ${keyword}))`,
        ]);
      }
    }
  }

  static fetchAll(date: Date) {
    return prisma.item.findMany({
      where: {
        is_delete: false,
      },
      select: {
        id: true,
        reference: true,
        description: true,
        item_brand: {
          select: {
            name: true,
          },
        },
        item_price: {
          select: {
            price: true,
            discount: true,
            discount_project: true,
          },
          where: {
            is_delete: false,
            effective_date: {
              lt: date,
            },
          },
          orderBy: {
            effective_date: "desc",
          },
          take: 1,
          skip: 0,
        },
        stock: {
          select: {
            stock: true,
          },
        },
      },
      orderBy: {
        reference: "asc",
      },
    });
  }

  static checkDeleteByReference(reference: string) {
    return prisma.$transaction([
      prisma.bill.count({
        where: {
          item: {
            reference: reference,
          },
        },
      }),
      prisma.good_receipt.count({
        where: {
          item: {
            reference: reference,
          },
        },
      }),
    ]);
  }

  static checkCountByIds(id: number[]) {
    return prisma.$transaction([
      prisma.bill.count({
        where: {
          item_id: {
            in: id,
          },
        },
      }),
      prisma.good_receipt.count({
        where: {
          item_id: {
            in: id,
          },
        },
      }),
    ]);
  }

  static delete(id: number, deleted_by: number) {
    return prisma.item.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: deleted_by,
      },
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
        reference: true,
        description: true,
        deleted_by: true,
        deleted_at: true,
        user_item_deleted_byTouser: {
          select: {
            name: true,
          },
        },
        item_brand_id: true,
      },
    });
  }

  static count() {
    return prisma.item.count({
      where: {
        is_delete: false,
      },
    });
  }

  static countByBrandId(brand_id: number) {
    return prisma.item.count({
      where: {
        item_brand_id: brand_id,
        is_delete: false,
      },
    });
  }

  static countByBrandIds(brand_ids: number[]) {
    return prisma.item.groupBy({
      by: ["item_brand_id"],
      where: {
        item_brand_id: {
          in: brand_ids,
        },
        is_delete: false,
      },
      _count: true,
    });
  }

  static fetchSoldByDate(date: Date = new Date()) {
    return prisma.$queryRaw`SELECT COUNT(DISTINCT(item.id)) AS count
    FROM item
    JOIN bill ON bill.item_id = item.id
    JOIN bill_code ON bill.bill_code_id = bill_code.id
    WHERE bill_code.is_confirm = 1
    AND bill_code.is_delete = 0
    AND YEAR(bill_code.date) = ${date.getFullYear()} AND MONTH(bill_code.date) = ${
      date.getMonth() + 1
    } AND DAY(bill_code.date) = ${date.getDate()}`;
  }

  static fetchChartItems(monthly: boolean, limit: number, offset: number) {
    const date = new Date();
    const start_date = new Date();

    if (monthly) {
      date.setMonth(date.getMonth() - offset);
      start_date.setMonth(date.getMonth() - limit - offset);
      return prisma.$queryRawUnsafe(`
        SELECT 
        YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, COUNT(bill.item_id) AS count
        FROM item
        JOIN bill ON bill.item_id = item.id
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(start_date.getMonth() + 1).toString().padStart(2, "0")}-01' AND LAST_DAY('${date.getFullYear().toString()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01')
        GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)`
      );
    } else {
      date.setDate(date.getDate() - offset);
      start_date.setDate(date.getDate() - limit - offset);
      return prisma.$queryRawUnsafe(
        `SELECT 
        YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, DAY(bill_code.date) AS day, COUNT(bill.item_id) AS count
        FROM item
        JOIN bill ON bill.item_id = item.id
        JOIN bill_code ON bill.bill_code_id = bill_code.id
        WHERE bill_code.is_confirm = 1
        AND bill_code.is_delete = 0
        AND bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(start_date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}' AND '${date.getFullYear().toString()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
        GROUP BY YEAR(bill_code.date), MONTH(bill_code.date), DAY(bill_code.date)`
      );
    }
  }

  static fetchStockById(id: number, offset: number, limit: number) {
    return prisma.$transaction([
      prisma.stock_card.findMany({
        where: {
          item_id: id,
        },
        select: {
          good_receipt: {
            select: {
              id: true,
              good_receipt_code: {
                select: {
                  name: true,
                  user_good_receipt_code_created_byTouser: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          adjustment_case: {
            select: {
              id: true,
              adjustment_case_code: {
                select: {
                  name: true,
                  user_adjustment_case_code_created_byTouser: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          bill: {
            select: {
              id: true,
              bill_code: {
                select: {
                  name: true,
                  user_bill_code_created_byTouser: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          date: true,
          quantity: true,
          lead_quantity: true,
        },
        orderBy: {
          date: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.stock_card.count({
        where: {
          item_id: id,
        },
      }),
    ]);
  }
}
