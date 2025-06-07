import { PrismaClient } from "@prisma/client";
import { IProductBrand, ProductBrandModel } from "../model/product-brand.model";
import { UserViewModel } from "../model/user.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import { IProductType, ProductTypeModel } from "../model/product-type.model";

export class ProductTypeRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IProductType): Promise<ProductTypeModel> {
    try {
      const result = await this.prisma.item_type.create({
        data: {
          name: data.name,
          created_by: data.created_by!,
          created_at: data.created_at,
        },
      });

      return new ProductTypeModel({
        id: result.id,
        name: result.name,
        created_by: result.created_by,
        created_at: result.created_at,
      });
    } catch (error) {
      throw error;
    }
  }

  async update(data: IProductType): Promise<ProductTypeModel> {
    try {
      const result = await this.prisma.item_type.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          updated_by: data.created_by!,
          updated_at: data.created_at,
        },
      });

      return new ProductTypeModel({
        id: result.id,
        name: result.name,
        created_by: result.created_by,
        created_at: result.created_at,
      });
    } catch (error) {
      throw error;
    }
  }

  async delete(id: number, userID: number) {
    try {
      const result = await this.prisma.item_type.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });

      return new ProductTypeModel({
        id: result.id,
        name: result.name,
        created_by: result.created_by,
        created_at: result.created_at,
        is_delete: result.is_delete,
      });
    } catch (error) {
      throw error;
    }
  }

  async fetch(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<ProductTypeModel>> {
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<any[]>(
          `
                SELECT item_type.id, item_type.name, item_type.created_at, 
                item_type.created_by, user.name AS user_name, user.username AS user_username,
                user.role AS user_role, 
                IF(COALESCE(itemCount.count, 0)=0, TRUE FALSE) AS can_delete, item_type.is_delete
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
                AND item_type.name LIKE '%${data.keyword}%'
                ORDER BY item_type.name ASC
                LIMIT ${data.pageSize} 
                OFFSET ${(data.page - 1) * data.pageSize}
              `
        ),
        this.prisma.item_type.count({
          where: {
            is_delete: false,
            name: {
              contains: data.keyword,
            },
          },
        }),
      ]);

      return {
        data: result.map((x) => {
          return new ProductTypeModel({
            id: x.id,
            name: x.name,
            created_by: x.created_by,
            created_at: x.created_at,
            user_item_type_created_byTouser: UserViewModel.fromMap({
              id: x.created_by,
              name: x.user_name,
              username: x.user_username,
              role: x.user_role,
            }),
            is_delete: x.is_delete,
            can_delete: x.can_delete,
          });
        }),
        count: count,
      };
    } catch (error) {
      throw error;
    }
  }

  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.item_type.findMany({
        where: {
          is_delete: false,
          name: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });

      return result.map((x) => {
        return new ProductTypeModel({
          id: x.id,
          name: x.name,
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchAll() {
    try {
      const result = await this.prisma.item_type.findMany({
        where: {
          is_delete: false,
        },
        orderBy: {
          name: "asc",
        },
      });

      return result.map((x) => {
        return new ProductTypeModel({
          id: x.id,
          name: x.name,
          created_by: x.created_by,
          created_at: x.created_at,
        });
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchByID(id: number) {
    try {
      const result = await this.prisma.$queryRaw<any[]>`
            SELECT item_type.id, item_type.created_at, item_type.name, 
            item_type.created_by, user.name AS user_name, user.username AS user_username,
            user.role AS user_role,
            item_type.is_delete,
            IF(COALESCE(itemCount.count, 0) = 0, TRUE, FALSE) AS can_delete
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

      if (result.length === 0) {
        return null;
      }

      const productType = result[0];

      return new ProductTypeModel({
        id: productType.id,
        name: productType.name,
        created_by: productType.created_by,
        created_at: productType.created_at,
        user_item_type_created_byTouser: UserViewModel.fromMap({
          id: productType.createdBy,
          name: productType.user_name,
          username: productType.user_username,
          role: productType.user_role,
        }),
        is_delete: productType.is_delete,
        can_delete: productType.can_delete,
      });
    } catch (error) {
      throw error;
    }
  }
}
