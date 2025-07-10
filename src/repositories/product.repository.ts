import { PrismaClient } from "@prisma/client";
import { IPriceProduct, IProduct, ProductModel } from "../model/product.model";
import { ProductBrandViewModel } from "../model/product-brand.model";
import { ProductTypeViewModel } from "../model/product-type.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";

export class ProductRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IProduct): Promise<ProductModel> {
    try {
      const result = await this.prisma.product.create({
        data: {
          reference: data.reference,
          description: data.description,
          product_brand_id: data.product_brand_id,
          product_type_id: data.product_type_id,
          created_by: data.created_by!,
          created_at: data.created_at,
          unit: data.unit,
          sales_price: data.sales_price,
          purchase_price: data.purchase_price,
          sales_discount: data.sales_discount,
          purchase_discount: data.purchase_discount,
          minimum_stock: data.minimum_stock,
        },
      });

      return new ProductModel({
        id: result.id,
        reference: result.reference,
        description: result.description,
        product_brand_id: result.product_brand_id,
        product_type_id: result.product_type_id,
        created_by: result.created_by,
        created_at: result.created_at,
        unit: result.unit,
      });
    } catch (error) {
      throw error;
    }
  }

  async updateSalesPrice(data: IPriceProduct): Promise<ProductModel> {
    try {
      if (data.product_unit_id == null) {
        const result = await this.prisma.product.update({
          where: { id: data.product_id },
          data: {
            sales_price: data.price,
            sales_discount: data.discount,
          },
        });

        return ProductModel.fromMap(result);
      } else {
        const result = await this.prisma.product_unit.update({
          where: { id: data.product_unit_id },
          data: {
            sales_price: data.price,
            sales_discount: data.discount,
          },
          include: {
            product: true,
          },
        });

        return ProductModel.fromMap(result);
      }
    } catch (error) {
      throw error;
    }
  }

  async updatePurchasePrice(data: IPriceProduct[]): Promise<void> {
    try {
      const updateData = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.product_unit_id != null) {
          updateData.push(
            this.prisma.product_unit.update({
              data: {
                purchase_price: item.price,
                purchase_discount: item.discount,
              },
              where: {
                id: item.product_unit_id,
              },
            })
          );
        } else {
          updateData.push(
            this.prisma.product.update({
              data: {
                purchase_price: item.price,
                purchase_discount: item.discount,
              },
              where: {
                id: item.product_id,
              },
            })
          );
        }
      }

      // prisma transaction
      await this.prisma.$transaction(updateData);
    } catch (error) {
      throw error;
    }
  }

  async update(data: IProduct): Promise<ProductModel> {
    try {
      const result = await this.prisma.product.update({
        where: { id: data.id },
        data: {
          reference: data.reference,
          description: data.description,
          product_brand_id: data.product_brand_id,
          product_type_id: data.product_type_id,
          created_by: data.created_by!,
          created_at: data.created_at,
          unit: data.unit,
          sales_price: data.sales_price,
          purchase_price: data.purchase_price,
          sales_discount: data.sales_discount,
          purchase_discount: data.purchase_discount,
          minimum_stock: data.minimum_stock,
        },
        include: {
          product_brand: true,
          product_type: true,
        },
      });

      return ProductModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while updating product: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async toggleActive(
    productID: number,
    currentStatus: boolean
  ): Promise<ProductModel> {
    try {
      const result = await this.prisma.product.update({
        where: {
          id: productID,
        },
        data: {
          is_active: !currentStatus,
        },
      });

      return ProductModel.fromMap(result);
    } catch (error) {
      console.error(
        `[error]: Error while toggling product active status: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchByID(productID: number): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.findUnique({
        where: {
          id: productID,
        },
        include: {
          product_brand: true,
          product_type: true,
        },
      });

      if (!result) return null;

      return ProductModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.product.findMany({
        select: {
          id: true,
          reference: true,
        },
        where: {
          is_active: true,
          OR: [
            { reference: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        },
      });

      return result.map((item) => {
        return {
          id: item.id,
          name: item.reference,
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchByReference(reference: string): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.findFirst({
        where: { reference },
      });

      if (!result) return null;

      return new ProductModel({
        id: result.id,
        reference: result.reference,
        description: result.description,
        product_brand_id: result.product_brand_id,
        product_type_id: result.product_type_id,
        created_by: result.created_by,
        created_at: result.created_at,
        unit: result.unit,
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchSales(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<ProductModel>> {
    try {
      const [result, count] = await Promise.all([
        this.prisma.product.findMany({
          where: {
            OR: [
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
            ],
            is_delete: false,
          },
          include: {
            product_type: true,
            product_brand: true,
          },
          take: data.pageSize,
          skip: (data.page - 1) * data.pageSize,
        }),
        this.prisma.product.count({
          where: {
            OR: [
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
            ],
            is_delete: false,
          },
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

  async fetchSalesPriceByID(id: number): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.findUnique({
        where: {
          id: id,
        },
        include: {
          product_brand: true,
          product_type: true,
          product_unit: true,
        },
      });

      if (!result) {
        return null;
      }

      return ProductModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async fetchAll(): Promise<ProductModel[]> {
    try {
      const results = await this.prisma.product.findMany({
        include: {
          product_brand: true,
          product_type: true,
          product_unit: true,
        },
      });

      return results.map((item) => ProductModel.fromMap(item));
    } catch (error) {
      throw error;
    }
  }
}
