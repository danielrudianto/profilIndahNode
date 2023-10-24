import { PrismaClient } from "@prisma/client";
import ErrorList from "../assets/error_list";
import { fetchMode } from "../interface/fetch.interface";

const prisma = new PrismaClient();

interface ICreateSupplier {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
}

class SupplierModel {
  /**
   * Create a new supplier data
   * @param data
   * @returns
   */
  static create(data: ICreateSupplier) {
    return prisma.supplier.create({
      data: {
        name: data.name,
        address: data.address,
        npwp: data.npwp,
        created_by: data.created_by,
        created_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        address: true,
        npwp: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        created_at: true,
      },
    });
  }

  /**
   * Fetch supplier data
   * Can be used for autocomplete, and pagination
   * @param keyword
   * @param limit
   * @param offset
   * @param mode
   */
  static async fetch(
    keyword: string,
    limit: number,
    offset: number,
    mode: fetchMode
  ) {
    if (mode == fetchMode.Autocomplete) {
      return prisma.supplier.findMany({
        where: {
          is_delete: false,
          name: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });
    } else if (mode == fetchMode.Pagination) {
      const result = await prisma.$transaction([
        prisma.$queryRawUnsafe(`
          SELECT supplier.id, supplier.name, supplier.address, 
          supplier.npwp, user.name AS created_by_name, supplier.created_by,
          supplier.created_at, COALESCE(supplierCount.count, 0) AS count
          FROM supplier
          JOIN user ON supplier.created_by = user.id
          LEFT JOIN (
            SELECT COUNT(good_receipt_code.id) AS count, good_receipt_code.supplier_id
            FROM good_receipt_code
            WHERE is_delete = 0
            GROUP BY good_receipt_code.supplier_id
          ) supplierCount
          ON supplierCount.supplier_id = supplier.id
          WHERE supplier.is_delete = 0
          AND supplier.name LIKE '%${keyword}%'
          ORDER BY name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `),
        prisma.supplier.count({
          where: {
            is_delete: false,
            name: {
              contains: keyword,
            },
          },
        }),
      ]);

      return {
        data: (result[0] as any[]).map((x: any) => {
          return {
            ...x,
            can_delete: x.count == 0,
            count: undefined,
          };
        }),
        count: result[1],
      };
    }
  }

  /**
   * Update supplier data
   * @param data
   * @returns The updated supplier data
   */
  static update(data: ICreateSupplier) {
    return prisma.supplier.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        address: data.address,
        npwp: data.npwp,
      },
    });
  }

  /**
   * Fetch supplier data by ID
   * @param id
   * @returns
   */
  static async fetchByID(id: number) {
    try {
      const supplier = await prisma.$queryRaw<any[]>`
        SELECT supplier.*, COALESCE(supplierCount.count, 0) AS count
        FROM supplier
        LEFT JOIN (
          SELECT COUNT(good_receipt_code.id) AS count, supplier_id
          FROM good_receipt_code
          JOIN supplier ON good_receipt_code.supplier_id = supplier.id
          WHERE good_receipt_code.is_delete = 0
          AND good_receipt_code.supplier_id = ${id}
        ) supplierCount
        ON supplier.id = supplierCount.supplier_id
        WHERE id = ${id}
      `;

      if (supplier.length == 0) {
        throw Error(ErrorList["Not found"]);
      }

      return {
        ...supplier[0],
        can_delete: supplier[0].count == 0,
        count: undefined,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching supplier ${error}`);
      throw Error(ErrorList["Internal server error"]);
    }
  }

  /**
   * Delete supplier by ID
   * @param id
   * @param deleted_by
   * @returns
   */
  static deleteByID(id: number, deleted_by: number) {
    return prisma.supplier.update({
      data: {
        deleted_at: new Date(),
        is_delete: true,
        deleted_by: deleted_by,
      },
      where: {
        id: id,
      },
    });
  }
}

export default SupplierModel;
