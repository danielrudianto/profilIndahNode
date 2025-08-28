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

  async fetchStockByProductID(id: number[]) {
    try {
      const stock = await this.prisma.product_stock.findMany({
        where: {
          id: {
            in: id,
          },
        },
      });

      return stock.map((x) => {
        return {
          product_id: x.id,
          stock: Number(x.stock),
        };
      });
    } catch (error) {
      throw error;
    }
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

  async fetchInadequateWarehouse(data: {
    page: number;
    pageSize: number;
    keyword: string;
  }) {
    const [result, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<any[]>`
        SELECT product.id, COALESCE(product_stock.stock) AS stock 
        FROM product
        LEFT JOIN product_stock ON product.id = product_stock.id
        WHERE COALESCE(product_stock.stock, 0) < product.minimum_stock
        AND COALESCE(product_stock.stock, 0) >= 0
        LIMIT ${data.pageSize}
        OFFSET ${(data.page - 1) * data.pageSize}
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(product.id) AS count 
        FROM product
        LEFT JOIN product_stock ON product.id = product_stock.id
        WHERE COALESCE(product_stock.stock, 0) < product.minimum_stock
        AND COALESCE(product_stock.stock, 0) >= 0
        LIMIT ${data.pageSize}
        OFFSET ${(data.page - 1) * data.pageSize}
      `,
    ]);

    return {
      data: result.map((x) => {
        return {
          id: x.id,
          product_stock: {
            stock: Number(x.stock),
          },
        };
      }),
      count:
        count.length == 0 ? 0 : count[0] == null ? 0 : Number(count[0].count),
    };
  }

  async fetchInadequateStock(data: {
    page: number;
    pageSize: number;
    keyword: string;
    brands: number[];
    types: number[];
  }) {
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<any[]>(`
          SELECT product.*, COALESCE(product_stock.stock, 0) AS stock, product_brand.name AS brand_name, product_type.name AS type_name,
          product_brand.created_by AS brand_created_by, product_type.created_by AS type_created_by
          FROM product
          LEFT JOIN product_stock ON product_stock.id = product.id
          JOIN product_brand ON product.product_brand_id = product_brand.id
          JOIN product_type ON product.product_type_id = product_type.id
          WHERE COALESCE(product_stock.stock,0) < product.minimum_stock
          AND COALESCE(product_stock.stock, 0) >= 0
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
          AND COALESCE(product_stock.stock, 0) >= 0
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

  updateMany = async (items: { productID: number; quantity: number }[]) => {
    try {
      const updateData = [];
      for (let item of items) {
        updateData.push(
          this.prisma.product_stock.upsert({
            where: {
              id: item.productID,
            },
            create: {
              id: item.productID,
              stock: item.quantity,
            },
            update: {
              stock: {
                increment: item.quantity,
              },
            },
          })
        );
      }

      return this.prisma.$transaction(updateData);
    } catch (error) {
      throw error;
    }
  };

  fetchOutputReport = async (data: {
    product_id: number[];
    month: number;
    year: number;
  }) => {
    const result = await this.prisma.$transaction(
      data.product_id.map((x) => {
        return this.prisma.stock_card.findFirst({
          where: {
            product_id: x,
            date: {
              lte: new Date(data.year, data.month - 1, 0),
            },
          },
          orderBy: [
            {
              date: "desc",
            },
            {
              id: "desc",
            },
          ],
        });
      })
    );

    return data.product_id.map((x) => {
      const stockIndex = result.findIndex((y) => y?.product_id == x);
      return {
        product_id: x,
        stock: stockIndex == -1 ? 0 : Number(result[stockIndex]?.stock),
      };
    });
  };
}
