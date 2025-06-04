import { prisma } from "../app";

export interface IProductBrand {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  can_delete?: string;
}

export interface IFetchProductBrand {
  id: number;
  name: string;
  user_name: string;
  created_at: Date;
  created_by: number;
  is_delete: boolean;
  can_delete: string;
}

export class ItemBrandModel {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  can_delete?: string;
  // initialize the model with default values
  constructor(data: IProductBrand) {
    this.id = data.id;
    this.name = data.name;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date();
    this.is_delete = data.is_delete || false;
    this.deleted_by = data.deleted_by || null;
    this.deleted_at = data.deleted_at || null;
    this.can_delete = data.can_delete || "1"; // default to "1" if not provided
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
        updated_at: new Date(),
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

  /**
   * Delete brand by ID
   * @param id
   * @param created_by
   * @returns
   */
  static deleteByID(id: number, created_by: number) {
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

  /**
   * Fetch if any active brand has the same name
   * @param name
   * @returns
   */
  static fetchByName(name: string) {
    return prisma.item_brand.findFirst({
      where: {
        name: name,
        is_delete: false,
      },
    });
  }

  /**
   * Fetch brand by ID
   * @param id
   * @returns
   */
  static fetchByID(id: number) {
    return prisma.$queryRaw<IFetchProductBrand[]>`
      SELECT item_brand.id, item_brand.name, user.name AS user_name, 
      item_brand.created_at, item_brand.created_by, item_brand.is_delete, 
      IF(COALESCE(itemCount.count, 0) = 0,"1", "0") AS can_delete
      FROM item_brand
      LEFT JOIN user ON user.id = item_brand.created_by
      LEFT JOIN (
        SELECT COUNT(*) AS count, item_brand_id 
        FROM item 
        WHERE is_delete = 0 
        GROUP BY item_brand_id
      ) itemCount ON itemCount.item_brand_id = item_brand.id
      WHERE item_brand.id = ${id}
    `;
  }

  /**
   * Fetch autocomplete brand
   * @param keyword
   * @returns
   */
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
        prisma.$queryRaw`
          SELECT item_brand.id, item_brand.name, user.name AS created_by_name, item_brand.created_at, item_brand.created_by, COALESCE(itemCount.count, 0) AS count, item_brand.is_delete
          FROM item_brand
          LEFT JOIN (
            SELECT COUNT(id) AS count, item_brand_id
            FROM item
            WHERE item.is_delete = 0
            GROUP BY item_brand_id
          ) itemCount
          ON item_brand.id = itemCount.item_brand_id
          JOIN user ON item_brand.created_by = user.id
          WHERE item_brand.is_delete = 0
          ORDER BY item_brand.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
        prisma.item_brand.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.$queryRawUnsafe(`
          SELECT item_brand.id, item_brand.name, user.name AS created_by_name, item_brand.created_at, item_brand.created_by, COALESCE(itemCount.count, 0) AS count, item_brand.is_delete
          FROM item_brand
          LEFT JOIN (
            SELECT COUNT(id) AS count, item_brand_id
            FROM item
            WHERE item.is_delete = 0
            GROUP BY item_brand_id
          ) itemCount
          ON item_brand.id = itemCount.item_brand_id
          JOIN user ON item_brand.created_by = user.id
          WHERE item_brand.is_delete = 0
          AND item_brand.name LIKE '%${keyword}%'
          ORDER BY item_brand.name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
        prisma.item_brand.count({
          where: {
            name: {
              contains: keyword,
            },
            is_delete: false,
          },
        }),
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
  static fetchByIDs(ids: number[]) {
    return prisma.item_brand.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
