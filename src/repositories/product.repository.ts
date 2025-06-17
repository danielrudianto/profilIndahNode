import { PrismaClient } from "@prisma/client";
import { IProduct, ProductModel } from "../model/product.model";
import { ProductBrandViewModel } from "../model/product-brand.model";
import { ProductTypeViewModel } from "../model/product-type.model";

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

  async fetchByID(id: number): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.findUnique({
        where: { id },
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
}
