import { PrismaClient } from "@prisma/client";
import {
  IPackageCode,
  IPackagePrice,
  PackageCodeModel,
} from "../models/product-package.model";

export class ProductPackageRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
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

  async updateSalesPrice(data: IPackagePrice[]) {
    const updateData = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      updateData.push(
        this.prisma.package_code.update({
          where: {
            id: item.package_code_id,
          },
          data: {
            price: item.price,
          },
        })
      );
    }

    // prisma transaction
    await this.prisma.$transaction(updateData);
  }

  async delete(id: number, userID: number) {
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

  async fetchAll(): Promise<PackageCodeModel[]> {
    const result = await this.prisma.package_code.findMany({
      include: {
        package_content: {
          include: {
            product: true,
            product_unit: true,
          },
        },
      },
    });

    return result.map((x) => {
      return PackageCodeModel.fromMap(x);
    });
  }
}
