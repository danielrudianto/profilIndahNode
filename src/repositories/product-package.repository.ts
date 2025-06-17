import { PrismaClient } from "@prisma/client";
import { IPackageCode, PackageCodeModel } from "../model/product-package.model";
import { ProductUnitModel } from "../model/product-unit.model";
import { ProductModel } from "../model/product.model";

export class ProductPackageRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  async create(data: IPackageCode) {
    try {
      const result = await this.prisma.package_code.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          created_by: data.created_by!,
          created_at: data.created_at,
          package_content: {
            createMany: {
              data: data.package_content!.map((x) => {
                return {
                  product_id: x.product_id,
                  product_unit_id: x.product_unit_id,
                  quantity: x.quantity,
                  price: x.price,
                  discount: x.discount,
                };
              }),
            },
          },
        },
        include: {
          package_content: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      return PackageCodeModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on creating product package ${error}`);
      throw error;
    }
  }

  async update(data: IPackageCode): Promise<PackageCodeModel | null> {
    try {
      const result = await this.prisma.package_code.update({
        where: {
          id: data.id,
        },
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
        },
        include: {
          package_content: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      if (!result) {
        return null;
      }

      return PackageCodeModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error on updating product package ${error}`);
      throw error;
    }
  }

  async delete(id: number, userID: number) {
    // First get the package code by ID
    try {
      const result = await this.prisma.package_code.update({
        where: {
          id: id,
        },
        data: {
          is_delete: true,
          deleted_by: userID,
          deleted_at: new Date(),
        },
      });

      return result;
    } catch (error) {
      console.error(`[error]: Error on deleting product package ${error}`);
      throw error;
    }
  }

  async fetchByID(id: number): Promise<PackageCodeModel | null> {
    try {
      const result = await this.prisma.package_code.findUnique({
        where: {
          id: id,
        },
        include: {
          package_content: {
            include: {
              product: true,
              product_unit: true,
            },
          },
        },
      });

      if (!result) {
        return null;
      }

      return PackageCodeModel.fromMap(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching product package by ID ${error}`
      );
      throw error;
    }
  }
}
