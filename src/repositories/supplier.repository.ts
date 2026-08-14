import { ISupplier } from "../interfaces/supplier.interface";
import { PrismaClient } from "@prisma/client";
import SupplierModel from "../models/supplier.model";
import {
  IFetchCommon,
  IFetchCommonResult,
} from "../interfaces/fetch.interface";
import { toPositiveInt } from "../utils/sql.helper";

export class SupplierRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: ISupplier) {
    const result = await this.prisma.supplier.create({
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

    return new SupplierModel({
      id: result.id,
      name: result.name,
      address: result.address!,
      npwp: result.npwp,
      created_by: result.user.id,
      created_at: result.created_at!,
      can_delete: true,
    });
  }

  async update(data: ISupplier) {
    try {
      const result = await this.prisma.supplier.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          address: data.address,
          npwp: data.npwp,
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
          created_by: true,
          created_at: true,
        },
      });

      return new SupplierModel({
        id: result.id,
        name: result.name,
        address: result.address!,
        npwp: result.npwp || null,
        created_by: result.created_by!,
        created_at: result.created_at!,
      });
    } catch (error) {
      console.error(`[error]: Error on updating supplier ${error}`);
      throw new Error("Internal server error");
    }
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.supplier.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });

      return new SupplierModel({
        id: result.id,
        name: result.name,
        address: result.address!,
        npwp: result.npwp || null,
        created_by: result.created_by!,
        created_at: result.created_at!,
        is_delete: true,
      });
    } catch (error) {
      console.error(`[error]: Error on deleting supplier ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<ISupplier>> {
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<any[]>(
          `
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
              AND supplier.name LIKE ?
              ORDER BY name ASC
              LIMIT ${toPositiveInt(data.pageSize, 10)}
              OFFSET ${
                toPositiveInt(data.page, 1) * toPositiveInt(data.pageSize, 10) -
                toPositiveInt(data.pageSize, 10)
              }
            `,
          `%${data.keyword ?? ""}%`
        ),
        this.prisma.supplier.count({
          where: {
            is_delete: false,
            name: {
              contains: data.keyword,
            },
          },
        }),
      ]);

      return {
        data: result.map((item) => SupplierModel.fromMap(item)),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error on fetching supplier data ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.supplier.findMany({
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
          created_at: true,
          created_by: true,
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
        skip: 0,
      });

      return result.map((item) => SupplierModel.fromMap(item));
    } catch (error) {
      console.error(
        `[error]: Error on fetching autocomplete supplier data ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchByID(id: number): Promise<SupplierModel | null> {
    try {
      const supplier = await this.prisma.supplier.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          name: true,
          address: true,
          npwp: true,
          created_by: true,
          created_at: true,
          is_delete: true,
        },
      });

      if (!supplier) {
        return null;
      }

      return new SupplierModel({
        id: supplier.id,
        name: supplier.name,
        address: supplier.address!,
        npwp: supplier.npwp || null,
        created_by: supplier.created_by!,
        created_at: supplier.created_at!,
        is_delete: supplier.is_delete!,
      });
    } catch (error) {
      console.error(`[error]: Error on fetching supplier by ID ${error}`);
      throw error;
    }
  }
}
