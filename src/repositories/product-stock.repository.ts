import { PrismaClient } from "@prisma/client";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import { ProductBrandModel } from "../model/product-brand.model";
import { ProductTypeModel } from "../model/product-type.model";
import { ProductModel, ProductStockModel } from "../model/product.model";
import { StockCardModel } from "../model/stock-card.model";

export class ProductStockRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async incrementStock(productID: number, quantity: number) {
    try {
      //update or insert stock
      const result = await this.prisma.product_stock.upsert({
        where: { id: productID },
        update: {
          stock: {
            increment: quantity,
          },
        },
        create: {
          id: productID,
          stock: quantity,
        },
      });
    } catch (error) {
      console.error(`[error]: Error on incrementing stock: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchStock(productID: number[]) {
    try {
      const stocks = await this.prisma.product_stock.findMany({
        where: {
          id: {
            in: productID,
          },
        },
        select: {
          id: true,
          stock: true,
        },
      });

      return stocks.map((stock) => ({
        id: stock.id,
        stock: stock.stock,
      }));
    } catch (error) {
      console.error(`[error]: Error on fetching stock: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByProductID(data: {
    productID: number;
    page: number;
    pageSize: number;
  }) {
    const [result, count] = await this.prisma.$transaction([
      this.prisma.stock_card.findMany({
        where: {
          product_id: data.productID,
        },
        orderBy: [
          {
            date: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
      }),
      this.prisma.stock_card.count({
        where: {
          product_id: data.productID,
        },
      }),
    ]);

    return {
      data: result.map((x) => {
        return StockCardModel.fromMap(x);
      }),
      count: count,
    };
  }

  async fetchProblematicStock(data: {
    page: number;
    pageSize: number;
    keyword: string;
    brands: number[];
    types: number[];
  }): Promise<IFetchCommonResult<ProductModel>> {
    try {
      let where = {
        product_stock: {
          stock: {
            lt: 0,
          },
        },
        is_delete: false,
      };

      if (data.brands.length > 0) {
        (where as any).product_brand = {
          id: {
            in: data.brands,
          },
        };
      }

      if (data.types.length > 0) {
        (where as any).product_type = {
          id: {
            in: data.types,
          },
        };
      }

      if (data.keyword.length > 0) {
        (where as any).OR = [
          {
            reference: {
              contains: data.keyword,
            },
          },
          {
            description: {
              contains: data.keyword,
            },
          },
        ];
      }
      const [result, count] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where: where,
          include: {
            product_brand: true,
            product_type: true,
            product_stock: true,
          },
          take: data.pageSize,
          skip: (data.page - 1) * data.pageSize,
          orderBy: [
            {
              reference: "asc",
            },
          ],
        }),
        this.prisma.product.count({
          where: where,
        }),
      ]);

      return {
        data: result.map((x) => {
          return ProductModel.fromMap(x);
        }),
        count: count,
      };
    } catch (error) {
      throw error;
    }
  }

  async fetchInadequateStock(data: {
    page: number;
    pageSize: number;
    keyword: string;
    brands: number[];
    types: number[];
  }) {
    console.log(data);
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<any[]>(`
          SELECT product.*, product_stock.stock, product_brand.name AS brand_name, product_type.name AS type_name,
          product_brand.created_by AS brand_created_by, product_type.created_by AS type_created_by
          FROM product
          LEFT JOIN product_stock ON product_stock.id = product.id
          JOIN product_brand ON product.product_brand_id = product_brand.id
          JOIN product_type ON product.product_type_id = product_type.id
          WHERE product_stock.stock < product.minimum_stock
          AND (
            product.reference LIKE '%${data.keyword}%'
            OR product.description LIKE '%${data.keyword}%'
          )
          ORDER BY product.reference ASC
          LIMIT ${data.pageSize}
          OFFSET ${(data.page - 1) * data.pageSize}
        `),
        this.prisma.$queryRawUnsafe<any[]>(`
          SELECT COUNT(product.id) AS count
          FROM product
          JOIN product_stock ON product_stock.id = product.id
          WHERE product_stock.stock < product.minimum_stock
          AND (
            product.reference LIKE '%${data.keyword}%'
            OR product.description LIKE '%${data.keyword}%'
          )
        `),
      ]);

      let formattedCount = 0;
      if (count == undefined || count.length == 0) {
        formattedCount = 0;
      } else {
        formattedCount = Number(count[0].count);
      }
      return {
        data: result.map((x) => {
          return new ProductModel({
            id: x.id,
            reference: x.reference,
            description: x.description,
            product_brand_id: x.product_brand_id,
            product_type_id: x.product_type_id,
            created_at: new Date(x.created_at),
            created_by: x.created_by,
            minimum_stock: Number(x.minimum_stock),
            unit: x.unit,
            product_brand: new ProductBrandModel({
              id: x.product_brand_id,
              name: x.brand_name,
              created_by: x.brand_created_by,
            }),
            product_type: new ProductTypeModel({
              id: x.product_type_id,
              name: x.type_name,
              created_by: x.type_created_by,
            }),
            product_stock: {
              product_id: x.id,
              stock: Number(x.stock),
            },
          });
        }),
        count: formattedCount,
      };
    } catch (error) {
      throw error;
    }
  }
}
