import { PrismaClient } from "@prisma/client";
import { prisma } from "../helper/database.helper";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";
import {
  mongoStockInModel,
  mongoStockOutModel,
} from "../mongo-model/mongo-stock-in.model";
import { ProductBrandModel } from "./product-brand.model";

export interface IPromotion {
  id?: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  target: number;
  created_by: number;
  created_at: Date;
  promotion?: {
    id?: number;
    rule: string;
    value: string;
    promotion_code_id?: number;
  }[];
  promotion_brand?: {
    id?: number;
    brand_id: number;
    brand?: ProductBrandModel;
    promotion_code_id?: number;
  }[];
  supplier_id: number;
}

class PromotionModel {
  id?: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  target: number;
  created_by: number;
  created_at: Date;
  promotion?: {
    id?: number;
    rule: string;
    value: string;
  }[];
  promotion_brand?: {
    id?: number;
    brand_id: number;
    brand?: ProductBrandModel;
    promotion_code_id?: number;
  }[];
  supplier_id: number;

  constructor(data: IPromotion) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.target = data.target;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.promotion =
      data.promotion == undefined
        ? undefined
        : data.promotion.map((rule) => ({
            id: rule.id,
            rule: rule.rule,
            value: rule.value,
          }));
    this.promotion_brand =
      data.promotion_brand == undefined
        ? undefined
        : data.promotion_brand.map((brand) => {
            return {
              id: brand.id,
              brand_id: brand.brand_id,
              brand: brand.brand
                ? ProductBrandModel.fromMap(brand.brand)
                : undefined,
              promotion_code_id: brand.promotion_code_id,
            };
          });

    this.supplier_id = data.supplier_id;
  }

  static fromMap(data: any): PromotionModel {
    return new PromotionModel({
      id: data.id,
      name: data.name,
      description: data.description,
      startDate: new Date(data.start),
      endDate: data.end == null ? null : new Date(data.end),
      target: Number(data.target),
      created_by: data.created_by,
      created_at: data.created_at,
      promotion:
        data.promotion != undefined
          ? data.promotion.map((rule: any) => ({
              id: rule.id,
              rule: rule.rule,
              value: rule.value,
            }))
          : undefined,
      promotion_brand:
        data.promotion_brand != undefined
          ? data.promotion_brand.map((brand: any) => ({
              id: brand.id,
              brand_id: brand.brand_id,
              brand: brand.brand
                ? ProductBrandModel.fromMap(brand.brand)
                : undefined,
              promotion_code_id: brand.promotion_code_id,
            }))
          : undefined,
      supplier_id: data.supplier_id,
    });
  }

  // static fetch(keyword: string, page: number) {
  //   return Promise.all([
  //     prisma.promotion_code.findMany({
  //       where: {
  //         OR: [
  //           {
  //             name: {
  //               contains: keyword,
  //             },
  //           },
  //           {
  //             description: {
  //               contains: keyword,
  //             },
  //           },
  //         ],
  //       },
  //       include: {
  //         promotion_code_created_by: {
  //           select: {
  //             name: true,
  //           },
  //         },
  //         brand: {
  //           select: {
  //             name: true,
  //           },
  //         },
  //         supplier: {
  //           select: {
  //             name: true,
  //           },
  //         },
  //       },
  //       orderBy: {
  //         created_at: "desc",
  //       },
  //       skip: (page - 1) * 10,
  //       take: 10,
  //     }),
  //     prisma.promotion_code.count({
  //       where: {
  //         name: {
  //           contains: keyword,
  //         },
  //       },
  //     }),
  //   ]);
  // }

  // static fetchActive() {
  //   return prisma.promotion_code.findMany({
  //     where: {
  //       OR: [
  //         {
  //           AND: [
  //             {
  //               end: null,
  //             },
  //             {
  //               is_delete: false,
  //             },
  //           ],
  //         },
  //         {
  //           AND: [
  //             {
  //               end: {
  //                 gt: new Date(),
  //               },
  //             },
  //             {
  //               is_delete: false,
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //     include: {
  //       promotion_code_created_by: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //       brand: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //       supplier: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // static countActive() {
  //   return prisma.promotion_code.count({
  //     where: {
  //       OR: [
  //         {
  //           AND: [
  //             {
  //               end: null,
  //             },
  //             {
  //               is_delete: false,
  //             },
  //           ],
  //         },
  //         {
  //           AND: [
  //             {
  //               end: {
  //                 gt: new Date(),
  //               },
  //             },
  //             {
  //               is_delete: false,
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //   });
  // }

  // static fetchByID(id: number) {
  //   return prisma.promotion_code.findUnique({
  //     where: {
  //       id: id,
  //     },
  //     include: {
  //       promotion: {
  //         select: {
  //           rule: true,
  //           value: true,
  //         },
  //       },
  //       brand: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //       supplier: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // static calculateByID(
  //   itemIDs: number[],
  //   start: Date,
  //   end: Date | null,
  //   supplier_id: number
  // ) {
  //   // Calculate sales in promotion period
  //   if (end == null) {
  //     return Promise.all([
  //       mongoStockOutModel.aggregate([
  //         {
  //           $match: {
  //             date: {
  //               $gte: start,
  //             },
  //             adjustmentCaseCodeID: null,
  //             adjustmentCaseID: null,
  //             itemID: {
  //               $in: itemIDs,
  //             },
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: null,
  //             total: {
  //               $sum: {
  //                 $multiply: ["$quantity", "$value"],
  //               },
  //             },
  //           },
  //         },
  //       ]),
  //       mongoOverflowModel.aggregate([
  //         {
  //           $match: {
  //             date: {
  //               $gte: start,
  //             },
  //             adjustmentCaseCodeID: null,
  //             adjustmentCaseID: null,
  //             itemID: {
  //               $in: itemIDs,
  //             },
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: null,
  //             total: {
  //               $sum: {
  //                 $multiply: ["$quantity", "$value"],
  //               },
  //             },
  //           },
  //         },
  //       ]),
  //       // Calculate the stock in
  //       mongoStockInModel.aggregate([
  //         {
  //           $match: {
  //             date: {
  //               $gte: start,
  //             },
  //             adjustmentCaseCodeID: null,
  //             adjustmentCaseID: null,
  //             itemID: {
  //               $in: itemIDs,
  //             },
  //             supplierID: supplier_id,
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: null,
  //             total: {
  //               $sum: {
  //                 $multiply: ["$quantity", "$price"],
  //               },
  //             },
  //           },
  //         },
  //       ]),
  //     ]);
  //   } else {
  //     return Promise.all([
  //       mongoStockOutModel.aggregate([
  //         {
  //           $match: {
  //             $and: [
  //               {
  //                 date: {
  //                   $gte: start,
  //                 },
  //               },
  //               {
  //                 date: {
  //                   $lte: end,
  //                 },
  //               },
  //             ],
  //             adjustmentCaseCodeID: null,
  //             adjustmentCaseID: null,
  //             itemID: {
  //               $in: itemIDs,
  //             },
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: null,
  //             total: {
  //               $sum: {
  //                 $multiply: ["$quantity", "$value"],
  //               },
  //             },
  //           },
  //         },
  //       ]),
  //       mongoOverflowModel.aggregate([
  //         {
  //           $match: {
  //             $and: [
  //               {
  //                 date: {
  //                   $gte: start,
  //                 },
  //               },
  //               {
  //                 date: {
  //                   $lte: end,
  //                 },
  //               },
  //             ],
  //             adjustmentCaseCodeID: null,
  //             adjustmentCaseID: null,
  //             itemID: {
  //               $in: itemIDs,
  //             },
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: null,
  //             total: {
  //               $sum: {
  //                 $multiply: ["$quantity", "$value"],
  //               },
  //             },
  //           },
  //         },
  //       ]),
  //       // Calculate the stock in
  //       mongoStockInModel.aggregate([
  //         {
  //           $match: {
  //             $and: [
  //               {
  //                 date: {
  //                   $gte: start,
  //                 },
  //               },
  //               {
  //                 date: {
  //                   $lte: end,
  //                 },
  //               },
  //             ],
  //             adjustmentCaseCodeID: null,
  //             adjustmentCaseID: null,
  //             itemID: {
  //               $in: itemIDs,
  //             },
  //             supplierID: supplier_id,
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: null,
  //             total: {
  //               $sum: {
  //                 $multiply: ["$quantity", "$price"],
  //               },
  //             },
  //           },
  //         },
  //       ]),
  //     ]);
  //   }
  // }

  // static deleteRules(id: number) {
  //   return prisma.promotion.deleteMany({
  //     where: {
  //       promotion_code_id: id,
  //     },
  //   });
  // }
}

export default PromotionModel;
