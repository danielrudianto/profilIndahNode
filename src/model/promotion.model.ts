import { prisma } from "../app";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";
import {
  mongoStockInModel,
  mongoStockOutModel,
} from "../mongo-model/mongo-stock-in.model";

interface IPromotionRule {
  rule: string;
  value: string;
}

interface ICreatePromotion {
  name: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  target: string;
  createdBy: number;
  rules: IPromotionRule[];
  brand_id: number;
  supplier_id: number;
}

interface IUpdatePromotion extends ICreatePromotion {
  id: number;
}

class PromotionModel {
  static create(data: ICreatePromotion) {
    return prisma.promotion_code.create({
      data: {
        name: data.name,
        description: data.description,
        start: data.startDate,
        end: data.endDate == null ? null : data.endDate,
        target: data.target,
        created_by: data.createdBy,
        created_at: new Date(),
        promotion: {
          createMany: {
            data: data.rules,
          },
        },
        brand_id: data.brand_id,
        supplier_id: data.supplier_id,
      },
    });
  }

  static update(data: IUpdatePromotion) {
    return prisma.promotion_code.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        description: data.description,
        start: data.startDate,
        end: data.endDate == null ? null : data.endDate,
        target: data.target,
        promotion: {
          createMany: {
            data: data.rules,
          },
        },
        brand_id: data.brand_id,
        supplier_id: data.supplier_id,
      },
    });
  }

  static fetch(keyword: string, page: number) {
    return Promise.all([
      prisma.promotion_code.findMany({
        where: {
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              description: {
                contains: keyword,
              },
            },
          ],
        },
        include: {
          promotion_code_created_by: {
            select: {
              name: true,
            },
          },
          brand: {
            select: {
              name: true,
            },
          },
          supplier: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
        skip: (page - 1) * 10,
        take: 10,
      }),
      prisma.promotion_code.count({
        where: {
          name: {
            contains: keyword,
          },
        },
      }),
    ]);
  }

  static fetchActive() {
    return prisma.promotion_code.findMany({
      where: {
        OR: [
          {
            AND: [
              {
                end: null,
              },
              {
                is_delete: false,
              },
            ],
          },
          {
            AND: [
              {
                end: {
                  gt: new Date(),
                },
              },
              {
                is_delete: false,
              },
            ],
          },
        ],
      },
      include: {
        promotion_code_created_by: {
          select: {
            name: true,
          },
        },
        brand: {
          select: {
            name: true,
          },
        },
        supplier: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static countActive() {
    return prisma.promotion_code.count({
      where: {
        OR: [
          {
            AND: [
              {
                end: null,
              },
              {
                is_delete: false,
              },
            ],
          },
          {
            AND: [
              {
                end: {
                  gt: new Date(),
                },
              },
              {
                is_delete: false,
              },
            ],
          },
        ],
      },
    });
  }

  static fetchByID(id: number) {
    return prisma.promotion_code.findUnique({
      where: {
        id: id,
      },
      include: {
        promotion: {
          select: {
            rule: true,
            value: true,
          },
        },
        brand: {
          select: {
            name: true,
          },
        },
        supplier: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  static calculateByID(
    itemIDs: number[],
    start: Date,
    end: Date | null,
    supplier_id: number
  ) {
    // Calculate sales in promotion period
    if (end == null) {
      return Promise.all([
        mongoStockOutModel.aggregate([
          {
            $match: {
              date: {
                $gte: start,
              },
              adjustmentCaseCodeID: null,
              adjustmentCaseID: null,
              itemID: {
                $in: itemIDs,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", "$value"],
                },
              },
            },
          },
        ]),
        mongoOverflowModel.aggregate([
          {
            $match: {
              date: {
                $gte: start,
              },
              adjustmentCaseCodeID: null,
              adjustmentCaseID: null,
              itemID: {
                $in: itemIDs,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", "$value"],
                },
              },
            },
          },
        ]),
        // Calculate the stock in
        mongoStockInModel.aggregate([
          {
            $match: {
              date: {
                $gte: start,
              },
              adjustmentCaseCodeID: null,
              adjustmentCaseID: null,
              itemID: {
                $in: itemIDs,
              },
              supplierID: supplier_id,
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", "$price"],
                },
              },
            },
          },
        ]),
      ]);
    } else {
      return Promise.all([
        mongoStockOutModel.aggregate([
          {
            $match: {
              $and: [
                {
                  date: {
                    $gte: start,
                  },
                },
                {
                  date: {
                    $lte: end,
                  },
                },
              ],
              adjustmentCaseCodeID: null,
              adjustmentCaseID: null,
              itemID: {
                $in: itemIDs,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", "$value"],
                },
              },
            },
          },
        ]),
        mongoOverflowModel.aggregate([
          {
            $match: {
              $and: [
                {
                  date: {
                    $gte: start,
                  },
                },
                {
                  date: {
                    $lte: end,
                  },
                },
              ],
              adjustmentCaseCodeID: null,
              adjustmentCaseID: null,
              itemID: {
                $in: itemIDs,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", "$value"],
                },
              },
            },
          },
        ]),
        // Calculate the stock in
        mongoStockInModel.aggregate([
          {
            $match: {
              $and: [
                {
                  date: {
                    $gte: start,
                  },
                },
                {
                  date: {
                    $lte: end,
                  },
                },
              ],
              adjustmentCaseCodeID: null,
              adjustmentCaseID: null,
              itemID: {
                $in: itemIDs,
              },
              supplierID: supplier_id,
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", "$price"],
                },
              },
            },
          },
        ]),
      ]);
    }
  }

  static deleteRules(id: number) {
    return prisma.promotion.deleteMany({
      where: {
        promotion_code_id: id,
      },
    });
  }
}

export default PromotionModel;
