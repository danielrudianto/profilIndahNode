import { PrismaClient } from "@prisma/client";
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
          promotion: {
            createMany: {
              data: data.promotion!.map((d) => {
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
                  brand_id: d.brand_id,
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
          promotion: {
            deleteMany: {},
            createMany: {
              data: data.promotion!.map((d) => ({
                rule: d.rule,
                value: d.value,
              })),
            },
          },
          promotion_brand: {
            deleteMany: {},
            createMany: {
              data: data.promotion_brand!.map((d) => ({
                brand_id: d.brand_id,
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
}
