"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionRepository = void 0;
const date_helper_1 = require("../helper/date.helper");
const promotion_model_1 = __importDefault(require("../model/promotion.model"));
class PromotionRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
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
                            data: data.promotion_rules.map((d) => {
                                return {
                                    rule: d.rule,
                                    value: d.value,
                                };
                            }),
                        },
                    },
                    promotion_brand: {
                        createMany: {
                            data: data.promotion_brand.map((d) => {
                                return {
                                    product_brand_id: d.product_brand_id,
                                };
                            }),
                        },
                    },
                    target: data.target,
                },
            });
            return promotion_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while creating promotion: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async update(data) {
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
                            data: data.promotion_rules.map((d) => ({
                                rule: d.rule,
                                value: d.value,
                            })),
                        },
                    },
                    promotion_brand: {
                        deleteMany: {},
                        createMany: {
                            data: data.promotion_brand.map((d) => ({
                                product_brand_id: d.product_brand_id,
                            })),
                        },
                    },
                },
            });
            return promotion_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while updating promotion: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetch(data) {
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
                data: result.map((item) => promotion_model_1.default.fromMap(item)),
                count: count,
            };
        }
        catch (error) {
            console.error(`[error]: Error while fetching promotions: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchByID(id) {
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
            if (!result)
                return null;
            return promotion_model_1.default.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error while fetching promotion by ID: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchResult(productID, supplierID, startDate, endDate) {
        let salesDateFilter = "";
        let purchaseDateFilter = "";
        if (endDate == null) {
            salesDateFilter = `AND sales_invoice_code.date >= ${date_helper_1.DateHelper.convertDate(startDate, date_helper_1.formatDate.YYYYMMDD)}`;
            purchaseDateFilter = `AND good_receipt_code.date >= ${date_helper_1.DateHelper.convertDate(startDate, date_helper_1.formatDate.YYYYMMDD)}`;
        }
        else {
            salesDateFilter = `AND sales_invoice_code.date BETWEEN ${date_helper_1.DateHelper.convertDate(startDate, date_helper_1.formatDate.YYYYMMDD)} AND ${date_helper_1.DateHelper.convertDate(endDate, date_helper_1.formatDate.YYYYMMDD)}`;
            purchaseDateFilter = `AND good_receipt_code.date BETWEEN ${date_helper_1.DateHelper.convertDate(startDate, date_helper_1.formatDate.YYYYMMDD)} AND ${date_helper_1.DateHelper.convertDate(endDate, date_helper_1.formatDate.YYYYMMDD)}`;
        }
        const [sales, purchase] = await this.prisma.$transaction([
            this.prisma.$queryRawUnsafe(`
        SELECT SUM(sales_invoice.quantity * (sales_invoice.price - sales_invoice.discount)) AS value
        FROM sales_invoice
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        ${salesDateFilter}
        AND sales_invoice.product_id IN (${productID.join(",")})
      `),
            this.prisma.$queryRawUnsafe(`
        SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        WHERE good_receipt_code.is_delete = 0
        ${purchaseDateFilter}
        AND good_receipt_code.supplier_id = ${supplierID}
        AND good_receipt.product_id IN (${productID.join(",")})
      `),
        ]);
        const salesNumber = sales == undefined || sales == null ? 0 : Number(sales[0].value);
        const purchaseNumber = purchase == undefined || purchase == null ? 0 : Number(purchase[0].value);
        return {
            sales: salesNumber,
            purchase: purchaseNumber,
        };
    }
    async countActive() {
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
        }
        catch (error) {
            throw error;
        }
    }
}
exports.PromotionRepository = PromotionRepository;
//# sourceMappingURL=promotion.repository.js.map