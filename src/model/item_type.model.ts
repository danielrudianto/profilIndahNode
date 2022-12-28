import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ItemTypeModel {
  id: number | null;
  name: string;
  created_by: number;

  constructor(name: string, created_by: number, id: number | null = null) {
    this.id = id;
    this.name = name;
    this.created_by = created_by;
  }

  create() {
    return prisma.item_type.create({
      data: {
        name: this.name,
        created_by: this.created_by,
      },
      select: {
        id: true,
        name: true,
        created_by: true,
        created_at: true,
        user_item_type_created_byTouser: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
  }

  update() {
    return prisma.item_type.update({
      where: {
        id: this.id!,
      },
      data: {
        name: this.name,
        updated_at: new Date(),
        updated_by: this.created_by,
      },
    });
  }

  static fetchItemById(id: number) {
    return prisma.item_type.findUnique({
      where: {
        id: id,
      },
      include: {
        item: {
          select: {
            _count: true,
          },
          where: {
            is_delete: false,
          },
        },
      },
    });
  }

  static fetchItems(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.item_type.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            created_at: true,
            created_by: true,
            user_item_type_created_byTouser: {
              select: {
                name: true,
              },
            },
            item: {
              select: {
                _count: true,
              },
              where: {
                is_delete: false,
              },
            },
          },
          take: limit,
          skip: offset,
        }),
        prisma.item_type.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.item_type.findMany({
          where: {
            is_delete: false,
            name: {
              contains: keyword,
            },
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            created_at: true,
            user_item_type_created_byTouser: {
              select: {
                name: true,
                id: true,
              },
            },
            item: {
              select: {
                _count: true,
              },
              where: {
                is_delete: false,
              },
            },
          },
          take: limit,
          skip: offset,
        }),
        prisma.item_type.count({
          where: {
            is_delete: false,
            name: {
              contains: keyword,
            },
          },
        }),
      ]);
    }
  }

  static fetchAutocomplete(keyword: string) {
    if (keyword == "") {
      return prisma.item_type.findMany({
        where: {
          is_delete: false,
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    } else {
      return prisma.item_type.findMany({
        where: {
          is_delete: false,
          name: {
            contains: keyword,
          },
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    }
  }

  static fetchByBrandIds(ids: number[]) {
    return prisma.item_type.findMany({
      where: {
        item: {
          some: {
            item_brand_id: {
              in: ids,
            },
            is_active: true,
            is_delete: false,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  static fetchSales(start_date: Date, end_date: Date) {
    return prisma.$queryRawUnsafe(`
    SELECT item_type.id, item_type.name, SUM((bill.price - bill.discount) * bill.quantity) AS value
    FROM bill
    JOIN item ON bill.item_id = item.id
    JOIN item_type ON item.item_type_id = item_type.id
    JOIN bill_code ON bill.bill_code_id = bill_code.id
    WHERE bill_code.is_confirm = 1
    AND bill_code.is_delete = 0
    AND bill_code.date >= '${start_date.getFullYear()}-${(
      start_date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}-${start_date.getDate().toString().padStart(2, "0")}'
    AND bill_code.date <= '${end_date.getFullYear()}-${(end_date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${end_date.getDate().toString().padStart(2, "0")}'
    GROUP BY item.item_type_id
    ORDER BY value DESC
    `);
  }

  static fetchFrequent(
    type_id: number,
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
      AND item_type.id = ${type_id}
      GROUP BY bill.item_id
      ORDER BY ordered DESC
      LIMIT ${limit}
    `);
  }

  static fetchById(id: number) {
    return prisma.item_type.findUnique({
      where: {
        id: id,
      },
    });
  }

  static deleteById(id: number, user_id: number) {
    return prisma.item_type.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_at: new Date(),
        deleted_by: user_id,
      },
      include: {
        user_item_type_deleted_byTouser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Fetching item type data by IDs (array of ID)
   */
  static fetchByIds(id: number[]) {
    return prisma.item_type.findMany({
      where: {
        id: {
          in: id,
        },
      },
    });
  }
}

export default ItemTypeModel;
