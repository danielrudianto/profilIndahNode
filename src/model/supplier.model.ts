import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class SupplierModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by?: number;
  created_at: Date;
  is_delete: boolean = false;
  deleted_by: number | null = null;
  deleted_at: Date | null = null;

  constructor(
    name: string,
    address: string,
    npwp: string | null = null,
    id: number | null = null,
    created_by: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    if (created_by != null) {
      this.created_by = created_by;
    }

    this.name = name;
    this.address = address;
    this.npwp = npwp;
    this.created_at = new Date();
  }

  create() {
    return prisma.supplier.create({
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        created_by: this.created_by!,
        created_at: this.created_at,
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

  update() {
    return prisma.supplier.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
      },
    });
  }

  static getAutocomplete(keyword: string) {
    if (keyword == "") {
      return prisma.supplier.findMany({
        where: {
          is_delete: false,
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
    } else {
      return prisma.supplier.findMany({
        where: {
          is_delete: false,
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              address: {
                contains: keyword,
              },
            },
          ],
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
    }
  }

  static fetch(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.$queryRaw`
          SELECT supplier.id, supplier.name, supplier.address, supplier.npwp, user.name AS created_by_name, supplier.created_by, supplier.created_at, COALESCE(supplierCount.count, 0) AS count
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
          ORDER BY name ASC
          LIMIT ${limit}
          OFFSET ${offset}
        `,
        prisma.supplier.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.$queryRawUnsafe(`
          SELECT supplier.id, supplier.name, supplier.address, supplier.npwp, user.name AS created_by_name, supplier.created_by, supplier.created_at, COALESCE(supplierCount.count, 0) AS count
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
    }
  }

  static fetchById(id: number) {
    return prisma.$queryRaw<any[]>`
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
  }

  static deleteById(id: number, deleted_by: number) {
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
