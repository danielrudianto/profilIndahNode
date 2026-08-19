import { PrismaClient } from "@prisma/client";
import { ProductBrandModel } from "../models/product-brand.model";
import { IProductBrand } from "../interfaces/product-brand.interface";
import { UserViewModel } from "../models/user.model";
import {
  IFetchCommon,
  IFetchCommonResult,
} from "../interfaces/fetch.interface";
import { toPositiveInt } from "../utils/sql.helper";

export class ProductBrandRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IProductBrand): Promise<ProductBrandModel> {
    const result = await this.prisma.product_brand.create({
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
  }

  update(data: IProductBrand) {
    return this.prisma.product_brand.update({
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
    return this.prisma.product_brand.update({
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
        SELECT  product_brand.id, product_brand.name, user.name AS user_name,
                user.username AS user_username, user.role AS user_role, 
                product_brand.created_at, product_brand.created_by, 
                IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete, 
                COALESCE(itemCount.count, 0) AS product_count,
                product_brand.is_delete
        FROM product_brand
        LEFT JOIN (
            SELECT COUNT(id) AS count, product_brand_id
            FROM product
            WHERE product.is_delete = 0
            GROUP BY product_brand_id
        ) itemCount ON product_brand.id = itemCount.product_brand_id
        JOIN user ON product_brand.created_by = user.id
        WHERE product_brand.is_delete = 0
    `;

    // Keyword dikirim sebagai parameter, bukan disisipkan ke teks query.
    // Kalau disisipkan, satu tanda kutip di dalam keyword sudah cukup untuk
    // mengubah arti query dan membaca tabel lain.
    const params: any[] = [];
    let keywordCondition = "";
    if (data.keyword) {
      keywordCondition = `AND product_brand.name LIKE ?`;
      params.push(`%${data.keyword}%`);
    }

    const limit = toPositiveInt(data.pageSize, 10);
    const offset = toPositiveInt(data.page, 1) * limit - limit;

    const query = `
      ${baseQuery}
      ${keywordCondition}
      ORDER BY product_brand.name ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countCondition = {
      is_delete: false,
      ...(data.keyword && { name: { contains: data.keyword } }),
    };

    const [result, count] = await this.prisma.$transaction([
      this.prisma.$queryRawUnsafe<any[]>(query, ...params),
      this.prisma.product_brand.count({ where: countCondition }),
    ]);

    return {
      data: result.map((x) => {
        return new ProductBrandModel({
          id: x.id,
          name: x.name,
          created_by: x.created_by,
          created_at: x.created_at,
          can_delete: x.can_delete,
          product_count: Number(x.product_count),
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
    const result = await this.prisma.product_brand.findFirst({
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
    const result = await this.prisma.product_brand.findMany({
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
        SELECT product_brand.id, product_brand.name, user.name AS user_name, 
        user.username AS user_username, user.role AS user_role,
        product_brand.created_at, product_brand.created_by, product_brand.is_delete, 
        IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
        FROM product_brand
        LEFT JOIN user ON user.id = product_brand.created_by
        LEFT JOIN (
        SELECT COUNT(id) AS count, product_brand_id 
        FROM product 
        WHERE is_delete = 0 
        GROUP BY product_brand_id
        ) itemCount ON itemCount.product_brand_id = product_brand.id
        WHERE product_brand.id = ${id}
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

  /**
   * Barang hidup dalam satu merek — berhalaman, bisa dicari.
   * Dipakai dialog rincian di halaman master merek barang.
   */
  async fetchProducts(
    brandID: number,
    data: IFetchCommon
  ): Promise<IFetchCommonResult<any>> {
    const kondisi = {
      is_delete: false,
      product_brand_id: brandID,
      ...(data.keyword
        ? {
            OR: [
              { reference: { contains: data.keyword } },
              { description: { contains: data.keyword } },
            ],
          }
        : {}),
    };

    const ambil = toPositiveInt(data.pageSize, 10);
    const lompat = toPositiveInt(data.page, 1) * ambil - ambil;

    const [result, count] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: kondisi,
        select: {
          id: true,
          reference: true,
          description: true,
          unit: true,
          product_type: { select: { name: true } },
          product_stock: { select: { stock: true } },
        },
        orderBy: { description: "asc" },
        take: ambil,
        skip: lompat,
      }),
      this.prisma.product.count({ where: kondisi }),
    ]);

    return {
      data: result.map((x) => ({
        id: x.id,
        reference: x.reference,
        description: x.description,
        unit: x.unit,
        category: x.product_type.name,
        stock: Number(x.product_stock?.stock ?? 0),
      })),
      count: count,
    };
  }
}
