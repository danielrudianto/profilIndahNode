import { PrismaClient } from "@prisma/client";
import { IProduct, ProductModel } from "../model/product.model";
import { ProductBrandViewModel } from "../model/product-brand.model";
import { ProductTypeViewModel } from "../model/product-type.model";

export class ProductRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IProduct): Promise<ProductModel> {
    try {
      const result = await this.prisma.item.create({
        data: {
          reference: data.reference,
          description: data.description,
          item_brand_id: data.brand_id,
          item_type_id: data.type_id,
          created_by: data.created_by!,
          created_at: data.created_at,
          unit: data.unit,
        },
      });

      return new ProductModel({
        id: result.id,
        reference: result.reference,
        description: result.description,
        brand_id: result.item_brand_id,
        type_id: result.item_type_id,
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
      const result = await this.prisma.item.findUnique({
        where: { id },
        select: {
          id: true,
          reference: true,
          description: true,
          item_brand_id: true,
          item_type_id: true,
          created_by: true,
          created_at: true,
          minimum_stock: true,
          unit: true,
          item_brand: {
            select: {
              id: true,
              name: true,
            },
          },
          item_type: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!result) return null;

      return new ProductModel({
        id: result.id,
        reference: result.reference,
        description: result.description,
        brand_id: result.item_brand_id,
        type_id: result.item_type_id,
        created_by: result.created_by,
        created_at: result.created_at,
        minimum_stock: Number(result.minimum_stock),
        unit: result.unit,
        item_brand: ProductBrandViewModel.fromMap(result.item_brand),
        item_type: ProductTypeViewModel.fromMap(result.item_type),
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.item.findMany({
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
      const result = await this.prisma.item.findFirst({
        where: { reference },
      });

      if (!result) return null;

      return new ProductModel({
        id: result.id,
        reference: result.reference,
        description: result.description,
        brand_id: result.item_brand_id,
        type_id: result.item_type_id,
        created_by: result.created_by,
        created_at: result.created_at,
        unit: result.unit,
      });
    } catch (error) {
      throw error;
    }
  }
}
