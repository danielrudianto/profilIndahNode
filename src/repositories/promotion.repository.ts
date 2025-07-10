import { PrismaClient } from "@prisma/client";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import PromotionModel, { IPromotion } from "../model/promotion.model";

export class PromotionRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IPromotion) {
    try {
      const result = await this.prisma.promotion_code.create({
        data: {
          name: data.name,
          description: data.description,
          start: data.startDate,
          end: data.endDate,
          created_by: data.created_by,
          created_at: new Date(),
          supplier_id: data.supplier_id,
          promotion_rules: {
            createMany: {
              data: data.promotion_rules!.map((d) => {
                return {
                  rule: d.rule,
                  value: d.value,
                };
              }),
            },
          },
          promotion_brand: {
            createMany: {
              data: data.promotion_brand!.map((d) => {
                return {
                  product_brand_id: d.product_brand_id,
                };
              }),
            },
          },
          target: data.target,
        },
      });

      return PromotionModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while creating promotion: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async update(data: IPromotion) {
    try {
      const result = await this.prisma.promotion_code.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          start: data.startDate,
          end: data.endDate,
          supplier_id: data.supplier_id,
          target: data.target,
          promotion_rules: {
            deleteMany: {},
            createMany: {
              data: data.promotion_rules!.map((d) => ({
                rule: d.rule,
                value: d.value,
              })),
            },
          },
          promotion_brand: {
            deleteMany: {},
            createMany: {
              data: data.promotion_brand!.map((d) => ({
                product_brand_id: d.product_brand_id,
              })),
            },
          },
        },
      });
      return PromotionModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while updating promotion: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<PromotionModel>> {
    try {
      const [result, count] = await this.prisma.$transaction([
        this.prisma.promotion_code.findMany({
          where: {
            name: {
              contains: data.keyword,
            },
            description: {
              contains: data.keyword,
            },
          },
          orderBy: { created_at: "desc" },
          skip: (data.page - 1) * data.pageSize,
          take: data.pageSize,
          include: {
            promotion_rules: true,
            promotion_brand: {
              include: {
                product_brand: true,
              },
            },
            supplier: true,
          },
        }),
        this.prisma.promotion_code.count({
          where: {
            name: {
              contains: data.keyword,
            },
            description: {
              contains: data.keyword,
            },
          },
        }),
      ]);

      return {
        data: result.map((item) => PromotionModel.fromMap(item)),
        count: count,
      };
    } catch (error) {
      console.error(`[error]: Error while fetching promotions: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchByID(id: number): Promise<PromotionModel | null> {
    try {
      const result = await this.prisma.promotion_code.findUnique({
        where: { id: id },
        include: {
          promotion_rules: true,
          promotion_brand: {
            include: {
              product_brand: true,
            },
          },
          promotion_code_created_by: {
            include: {
              user_avatar: true,
            },
          },
          promotion_code_deleted_by: {
            include: {
              user_avatar: true,
            },
          },
          promotion_code_updated_by: {
            include: {
              user_avatar: true,
            },
          },
          supplier: true,
        },
      });

      if (!result) return null;

      console.log(result);

      return PromotionModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while fetching promotion by ID: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async countActive(): Promise<number> {
    try {
      const result = await this.prisma.promotion_code.count({
        where: {
          is_delete: false,
          OR: [
            {
              end: null,
            },
            {
              end: {
                gt: new Date(),
              },
            },
          ],
        },
      });

      return result;
    } catch (error) {
      throw error;
    }
  }
}
