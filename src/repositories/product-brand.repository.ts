import { PrismaClient } from "@prisma/client";
import { IProductBrand, ProductBrandModel } from "../model/product-brand.model";
import { UserViewModel } from "../model/user.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";

export class ProductBrandRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IProductBrand): Promise<ProductBrandModel> {
    try {
      const result = await this.prisma.item_brand.create({
        data: {
          name: data.name,
          created_by: data.created_by,
        },
        include: {
          user: {
            select: {
              name: true,
              username: true,
              role: true,
            },
          },
        },
      });

      return new ProductBrandModel({
        id: result.id,
        name: result.name,
        created_by: result.created_by,
        created_at: result.created_at,
        user: UserViewModel.fromMap(result.user),
      });
    } catch (error) {
      throw error;
    }
  }

  update(data: IProductBrand) {
    return this.prisma.item_brand.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        updated_by: data.created_by,
        updated_at: data.created_at,
      },
    });
  }

  delete(id: number, userID: number) {
    return this.prisma.item_brand.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_by: userID,
        deleted_at: new Date(),
      },
    });
  }

  async fetch(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<ProductBrandModel>> {
    const baseQuery = `
        SELECT  item_brand.id, item_brand.name, user.name AS user_name,
                user.username AS user_username, user.role AS user_role, 
                item_brand.created_at, item_brand.created_by, 
                IF(COALESCE(itemCount.count, 0) = 0, TRUE, FALSE) AS can_delete, 
                item_brand.is_delete
        FROM item_brand
        LEFT JOIN (
            SELECT COUNT(id) AS count, item_brand_id
            FROM item
            WHERE item.is_delete = 0
            GROUP BY item_brand_id
        ) itemCount ON item_brand.id = itemCount.item_brand_id
        JOIN user ON item_brand.created_by = user.id
        WHERE item_brand.is_delete = 0
    `;

    const keywordCondition = data.keyword
      ? `AND item_brand.name LIKE '%${data.keyword}%'`
      : "";

    const query = `
      ${baseQuery}
      ${keywordCondition}
      ORDER BY item_brand.name ASC
      LIMIT ${data.pageSize}
      OFFSET ${(data.page - 1) * data.pageSize}
    `;

    const countCondition = {
      is_delete: false,
      ...(data.keyword && { name: { contains: data.keyword } }),
    };

    const [result, count] = await this.prisma.$transaction([
      this.prisma.$queryRawUnsafe<any[]>(query),
      this.prisma.item_brand.count({ where: countCondition }),
    ]);

    return {
      data: result.map((x) => {
        return new ProductBrandModel({
          id: x.id,
          name: x.name,
          created_by: x.created_by,
          created_at: x.created_at,
          can_delete: x.can_delete,
          user: UserViewModel.fromMap({
            id: x.created_by,
            name: x.user_name,
            username: x.user_username,
            role: x.user_role,
          }),
          is_delete: x.is_delete,
        });
      }),
      count: count,
    };
  }

  async fetchByName(name: string): Promise<ProductBrandModel | null> {
    const result = await this.prisma.item_brand.findFirst({
      where: {
        name: name,
        is_delete: false,
      },
    });

    if (!result) {
      return null;
    }

    return new ProductBrandModel({
      name: result.name,
      id: result.id,
      created_by: result.created_by,
      created_at: result.created_at,
    });
  }

  async fetchAutocomplete(keyword: string): Promise<ProductBrandModel[]> {
    const result = await this.prisma.item_brand.findMany({
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

    return result.map((item) => {
      return new ProductBrandModel({
        id: item.id,
        name: item.name,
        created_by: item.created_by,
        created_at: item.created_at,
      });
    });
  }

  async fetchByID(id: number): Promise<ProductBrandModel | null> {
    const result = await this.prisma.$queryRaw<any[]>`
        SELECT item_brand.id, item_brand.name, user.name AS user_name, 
        user.username AS user_username, user.role AS user_role
        item_brand.created_at, item_brand.created_by, item_brand.is_delete, 
        IF(COALESCE(itemCount.count, 0) = 0, TRUE, FALSE) AS can_delete
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

    if (result.length === 0) {
      return null;
    }

    const brandData = result[0];
    return new ProductBrandModel({
      id: brandData.id,
      name: brandData.name,
      created_by: brandData.created_by,
      created_at: brandData.created_at,
      can_delete: brandData.can_delete,
      user: UserViewModel.fromMap({
        id: brandData.created_by,
        name: brandData.user_name,
        username: brandData.user_username,
        role: brandData.user_role,
      }),
    });
  }
}
