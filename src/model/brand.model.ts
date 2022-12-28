import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class BrandModel {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;

  constructor(name: string, created_by: number, id: number | null = null) {
    if (id != null) {
      this.id = id;
    }
    this.name = name;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.item_brand.create({
      data: {
        name: this.name,
        created_by: this.created_by,
        created_at: this.created_at,
      },
      select: {
        id: true,
        name: true,
        created_by: true,
        created_at: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  update() {
    return prisma.item_brand.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        updated_at: this.created_at,
        updated_by: this.created_by,
      },
      select: {
        id: true,
        name: true,
        created_at: true,
        user: {
          select: {
            name: true,
          },
        },
        updated_at: true,
        updated_by: true,
        user_item_brand_updated_byTouser: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static delete(id: number, created_by: number) {
    return prisma.item_brand.update({
      where: {
        id: id,
      },
      data: {
        deleted_at: new Date(),
        deleted_by: created_by,
        is_delete: true,
      },
      include: {
        user_item_brand_deleted_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static fetchByName(name: string) {
    return prisma.item_brand.findFirst({
      where: {
        name: name,
        is_delete: false,
      },
    });
  }

  static fetchById(id: number) {
    return prisma.$transaction([
      prisma.item_brand.findUnique({
        where: {
          id: id,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.item.count({
        where: {
          item_brand_id: id,
          is_delete: false,
        },
      }),
    ]);
  }

  static fetchAutocomplete(keyword: string) {
    return prisma.item_brand.findMany({
      where: {
        name: {
          contains: keyword,
        },
        is_delete: false,
      },
      skip: 0,
      take: 5,
      orderBy: {
        name: "asc",
      },
    });
  }

  static fetch(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.item_brand.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        }),
        prisma.item_brand.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.item_brand.findMany({
          where: {
            is_delete: false,
            name: {
              contains: keyword,
            },
          },
          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                item: true,
              },
            },
          },
        }),
        prisma.item_brand.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    }
  }

  static checkDeleteById(id: number) {
    let count = false;
    prisma.item
      .count({
        where: {
          item_brand_id: id,
          is_delete: false,
        },
      })
      .then((result) => {
        if (result > 0) {
          count = false;
        } else {
          count = true;
        }
      });

    return count;
  }

  static fetchUsed(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.$queryRaw`
          SELECT item_brand.id, item_brand.name
          FROM item_brand
          JOIN (
            SELECT DISTINCT(item.item_brand_id) AS id
            FROM item
            JOIN stock ON stock.id = item.id
            WHERE item.is_delete = 0
            AND item.minimum_stock > stock.stock
          ) items
          ON item_brand.id = items.id
          LIMIT ${limit} OFFSET ${offset}
        `,
        prisma.$queryRaw`
          SELECT COUNT(item_brand.id) AS count
          FROM item_brand
          JOIN (
            SELECT DISTINCT(item.item_brand_id) AS id
            FROM item
            JOIN stock ON stock.id = item.id
            WHERE item.is_delete = 0
            AND item.minimum_stock > stock.stock
          ) items
          ON item_brand.id = items.id
        `,
      ]);
    } else {
      return prisma.$transaction([
        prisma.$queryRaw`
          SELECT item_brand.id, item_brand.name
          FROM item_brand
          JOIN (
            SELECT DISTINCT(item.item_brand_id) AS id
            FROM item
            JOIN stock ON stock.id = item.id
            WHERE item.is_delete = 0
            AND item.minimum_stock > stock.stock
          ) items
          ON item_brand.id = items.id
          WHERE INSTR(item_brand.name, ${keyword})
          LIMIT ${limit} OFFSET ${offset}
        `,
        prisma.$queryRaw`
          SELECT COUNT(item_brand.id) AS count
          FROM item_brand
          JOIN (
            SELECT DISTINCT(item.item_brand_id) AS id
            FROM item
            JOIN stock ON stock.id = item.id
            WHERE item.is_delete = 0
            AND item.minimum_stock > stock.stock
          ) items
          ON item_brand.id = items.id
          WHERE INSTR(item_brand.name, ${keyword})
        `,
      ]);
    }
  }

  static fetchSales(start_date: Date, end_date: Date) {
    return prisma.$queryRawUnsafe(`
      SELECT item_brand.id, item_brand.name, SUM((bill.price - bill.discount) * bill.quantity) AS value
      FROM bill
      JOIN item ON bill.item_id = item.id
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.is_confirm = 1
      AND bill_code.is_delete = 0
      AND bill_code.date >= '${start_date.getFullYear()}-${(
      start_date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${start_date.getDate().toString().padStart(2, "0")}'
      AND bill_code.date <= '${end_date.getFullYear()}-${(
      end_date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${end_date.getDate().toString().padStart(2, "0")}'
      GROUP BY item.item_brand_id
      ORDER BY value DESC
    `);
  }

  static fetchFrequent(
    brand_id: number,
    start_date: Date,
    end_date: Date,
    limit: number
  ) {
    const formatted_start_date = `${start_date.getFullYear()}-${(
      start_date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${start_date.getDate().toString().padStart(2, "0")}`;
    const formatted_end_date = `${end_date.getFullYear()}-${(
      end_date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${end_date.getDate().toString().padStart(2, "0")}`;

    return prisma.$queryRawUnsafe(`
      SELECT item.reference, item.description, item_brand.name AS brand_name, item_type.name AS type_name, SUM(bill.quantity * IF(bill.item_unit_id IS NULL, 1, item_unit.conversion)) AS ordered
      FROM bill
      JOIN item ON bill.item_id = item.id
      LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      JOIN bill_code ON bill.bill_code_id = bill_code.id
      WHERE bill_code.date >= '${formatted_start_date}'
      AND bill_code.date <= '${formatted_end_date}'
      AND bill_code.is_confirm = 1
      AND item_brand.id = ${brand_id}
      GROUP BY bill.item_id
      ORDER BY ordered DESC
      LIMIT ${limit}
    `);
  }

  /**
   * Fetching brand data by IDs (array of ID)
   */
  static fetchByIds(ids: number[])
  {
    return prisma.item_brand.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });
  }
}
