"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("../app");
const mongo_overflow_model_1 = require("../mongo-model/mongo-overflow.model");
const mongo_stock_in_model_1 = require("../mongo-model/mongo-stock-in.model");
class PromotionModel {
    static create(name, description, startDate, endDate, target, createdBy, rules, brand_id) {
        return app_1.prisma.promotion_code.create({
            data: {
                name: name,
                description: description,
                start: startDate,
                end: endDate == null ? null : endDate,
                target: target,
                created_by: createdBy,
                created_at: new Date(),
                promotion: {
                    createMany: {
                        data: rules,
                    },
                },
                brand_id: brand_id,
            },
        });
    }
    static update(id, name, description, startDate, endDate, target, rules, brand_id) {
        return app_1.prisma.promotion_code.update({
            where: {
                id: id,
            },
            data: {
                name: name,
                description: description,
                start: startDate,
                end: endDate == null ? null : endDate,
                target: target,
                promotion: {
                    createMany: {
                        data: rules,
                    },
                },
                brand_id: brand_id,
            },
        });
    }
    static fetch(keyword, page) {
        return Promise.all([
            app_1.prisma.promotion_code.findMany({
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
                },
                orderBy: {
                    created_at: "desc",
                },
                skip: (page - 1) * 10,
                take: 10,
            }),
            app_1.prisma.promotion_code.count({
                where: {
                    name: {
                        contains: keyword,
                    },
                },
            }),
        ]);
    }
    static fetchActive() {
        return app_1.prisma.promotion_code.findMany({
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
            },
        });
    }
    static countActive() {
        return app_1.prisma.promotion_code.count({
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
    static fetchByID(id) {
        return app_1.prisma.promotion_code.findUnique({
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
            },
        });
    }
    static calculateByID(itemIDs, start, end) {
        // Calculate sales in promotion period
        if (end == null) {
            return Promise.all([
                mongo_stock_in_model_1.mongoStockOutModel.aggregate([
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
                mongo_overflow_model_1.mongoOverflowModel.aggregate([
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
                mongo_stock_in_model_1.mongoStockInModel.aggregate([
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
                                    $multiply: ["$quantity", "$price"],
                                },
                            },
                        },
                    },
                ]),
            ]);
        }
        else {
            // return Promise.all([
            //   mongoStockOutModel.aggregate([
            //     // First lookup to product
            //     {
            //       $lookup: {
            //         from: "product",
            //         localField: "productID",
            //         foreignField: "_id",
            //         as: "product",
            //       },
            //     },
            //     // Then change from array to objecct
            //     {
            //       $unwind: "$product",
            //     },
            //     // Match all promotion rule
            //     ...promotion.map((x) => {
            //       if (x.rule == "Starts with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $regex: `^${x.value}`,
            //               $options: "i",
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Ends with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $regex: `${x.value}$`,
            //               $options: "i",
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Contains") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $regex: `${x.value}`,
            //               $options: "i",
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Does not start with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $not: {
            //                 $regex: `^${x.value}`,
            //                 $options: "i",
            //               },
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Does not end with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $not: {
            //                 $regex: `${x.value}$`,
            //                 $options: "i",
            //               },
            //             },
            //           },
            //         };
            //       } else {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $not: {
            //                 $regex: `${x.value}`,
            //                 $options: "i",
            //               },
            //             },
            //           },
            //         };
            //       }
            //     }),
            //     {
            //       $match: {
            //         "product.itemBrandID": brand_id,
            //       },
            //     },
            //     {
            //       $match: {
            //         date: {
            //           $gte: start,
            //           $lte: end,
            //         },
            //         adjustmentCaseCodeID: null,
            //         adjustmentCaseID: null,
            //       },
            //     },
            //     {
            //       $group: {
            //         _id: null,
            //         total: {
            //           $sum: "$total",
            //         },
            //       },
            //     },
            //   ]),
            //   mongoStockInModel.aggregate([
            //     // First lookup to product
            //     {
            //       $lookup: {
            //         from: "products",
            //         localField: "itemID",
            //         foreignField: "_id",
            //         as: "product",
            //       },
            //     },
            //     // Then change from array to objecct
            //     {
            //       $unwind: "$product",
            //     },
            //     // Match all promotion rule
            //     ...promotion.map((x) => {
            //       if (x.rule == "Starts with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $regex: `^${x.value}`,
            //               $options: "i",
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Ends with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $regex: `${x.value}$`,
            //               $options: "i",
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Contains") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $regex: `${x.value}`,
            //               $options: "i",
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Does not start with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $not: {
            //                 $regex: `^${x.value}`,
            //                 $options: "i",
            //               },
            //             },
            //           },
            //         };
            //       } else if (x.rule == "Does not end with") {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $not: {
            //                 $regex: `${x.value}$`,
            //                 $options: "i",
            //               },
            //             },
            //           },
            //         };
            //       } else {
            //         return {
            //           $match: {
            //             "product.reference": {
            //               $not: {
            //                 $regex: `${x.value}`,
            //                 $options: "i",
            //               },
            //             },
            //           },
            //         };
            //       }
            //     }),
            //     {
            //       $match: {
            //         "product.itemBrandID": brand_id,
            //       },
            //     },
            //     {
            //       $match: {
            //         date: {
            //           $gte: start,
            //           $lte: end,
            //         },
            //         adjustmentCaseCodeID: null,
            //         adjustmentCaseID: null,
            //       },
            //     },
            //     {
            //       $group: {
            //         _id: null,
            //         total: {
            //           $sum: "$total",
            //         },
            //       },
            //     },
            //   ]),
            // ]);
        }
    }
    static deleteRules(id) {
        return app_1.prisma.promotion.deleteMany({
            where: {
                promotion_code_id: id,
            },
        });
    }
}
exports.default = PromotionModel;
//# sourceMappingURL=promotion.model.js.map