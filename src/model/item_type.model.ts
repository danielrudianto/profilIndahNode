import { PrismaClient } from "@prisma/client";
import { fetchMode } from "../interface/fetch.interface";

const prisma = new PrismaClient();

interface ICreateItemType {
  name: string;
  userID: number;
}

interface IUpdateItemType extends ICreateItemType {
  id: number;
}

interface IFetchItemType {
  id: number;
  name: string;
  created_at: string;
  created_by: number;
  createdByName: string;
  is_delete: number;
  count: number;
}

class ItemTypeModel {
  /**
   * Create a new item type data
   * @param data
   * @returns ItemType
   */
  static create(data: ICreateItemType) {
    return prisma.item_type.create({
      data: {
        name: data.name,
        created_by: data.userID,
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

  /**
   * Fetch item type by ID
   * @param data
   * @returns
   */
  static fetchByID(id: number) {
    return prisma.$queryRaw<IFetchItemType[]>`
      SELECT item_type.id, item_type.created_at, item_type.name, 
      item_type.created_by, user.name AS createdByName, item_type.is_delete,
      COALESCE(itemCount.count, 0) AS count
      FROM item_type
      LEFT JOIN (
        SELECT COUNT(id) AS count, item_type_id
        FROM item
        WHERE item.is_delete = 0
        GROUP BY item.item_type_id
      ) AS itemCount
      ON item_type.id = itemCount.item_type_id
      JOIN user ON item_type.created_by = user.id
      WHERE item_type.id = ${id}
    `;
  }

  /**
   * Update item type data by ID
   * @param data
   * @returns
   */
  static updateByID(data: IUpdateItemType) {
    return prisma.item_type.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        updated_at: new Date(),
        updated_by: data.userID,
      },
      include: {
        item: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  static fetch(
    keyword: string,
    limit: number,
    offset: number,
    mode: fetchMode
  ) {
    if (mode == fetchMode.Pagination) {
      return prisma.$transaction([
        prisma.$queryRawUnsafe<IFetchItemType[]>(
          `
          SELECT item_type.id, item_type.name, item_type.created_at, 
          item_type.created_by, user.name AS createdByName, 
          COALESCE(itemCount.count, 0) AS count, item_type.is_delete
          FROM item_type
          LEFT JOIN (
            SELECT COUNT(id) AS count, item_type_id
            FROM item
            WHERE item.is_delete = 0
            GROUP BY item.item_type_id
          ) AS itemCount
          ON item_type.id = itemCount.item_type_id
          JOIN user ON item_type.created_by = user.id
          WHERE item_type.is_delete = 0
          AND item_type.name LIKE '%${keyword}%'
          ORDER BY item_type.name ASC
          LIMIT ${limit} OFFSET ${offset}`
        ),
        prisma.item_type.count({
          where: {
            is_delete: false,
            name: {
              contains: keyword,
            },
          },
        }),
      ]);
    } else if (mode == fetchMode.Autocomplete) {
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
