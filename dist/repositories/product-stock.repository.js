"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductStockRepository = void 0;
const product_brand_model_1 = require("../model/product-brand.model");
const product_type_model_1 = require("../model/product-type.model");
const product_model_1 = require("../model/product.model");
const stock_card_model_1 = require("../model/stock-card.model");
class ProductStockRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async incrementStock(productID, quantity) {
        try {
            //update or insert stock
            const result = await this.prisma.product_stock.upsert({
                where: { id: productID },
                update: {
                    stock: {
                        increment: quantity,
                    },
                },
                create: {
                    id: productID,
                    stock: quantity,
                },
            });
        }
        catch (error) {
            console.error(`[error]: Error on incrementing stock: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchStock(productID) {
        try {
            const stocks = await this.prisma.product_stock.findMany({
                where: {
                    id: {
                        in: productID,
                    },
                },
                select: {
                    id: true,
                    stock: true,
                },
            });
            return stocks.map((stock) => ({
                id: stock.id,
                stock: stock.stock,
            }));
        }
        catch (error) {
            console.error(`[error]: Error on fetching stock: ${error}`);
            throw new Error("Internal server error");
        }
    }
    async fetchByProductID(data) {
        const [result, count] = await this.prisma.$transaction([
            this.prisma.stock_card.findMany({
                where: {
                    product_id: data.productID,
                },
                orderBy: [
                    {
                        date: "desc",
                    },
                    {
                        id: "desc",
                    },
                ],
                take: data.pageSize,
                skip: (data.page - 1) * data.pageSize,
            }),
            this.prisma.stock_card.count({
                where: {
                    product_id: data.productID,
                },
            }),
        ]);
        return {
            data: result.map((x) => {
                return stock_card_model_1.StockCardModel.fromMap(x);
            }),
            count: count,
        };
    }
    async fetchProblematicStock(data) {
        try {
            let where = {
                product_stock: {
                    stock: {
                        lt: 0,
                    },
                },
                is_delete: false,
            };
            if (data.brands.length > 0) {
                where.product_brand = {
                    id: {
                        in: data.brands,
                    },
                };
            }
            if (data.types.length > 0) {
                where.product_type = {
                    id: {
                        in: data.types,
                    },
                };
            }
            if (data.keyword.length > 0) {
                where.OR = [
                    {
                        reference: {
                            contains: data.keyword,
                        },
                    },
                    {
                        description: {
                            contains: data.keyword,
                        },
                    },
                ];
            }
            const [result, count] = await this.prisma.$transaction([
                this.prisma.product.findMany({
                    where: where,
                    include: {
                        product_brand: true,
                        product_type: true,
                        product_stock: true,
                    },
                    take: data.pageSize,
                    skip: (data.page - 1) * data.pageSize,
                    orderBy: [
                        {
                            reference: "asc",
                        },
                    ],
                }),
                this.prisma.product.count({
                    where: where,
                }),
            ]);
            return {
                data: result.map((x) => {
                    return product_model_1.ProductModel.fromMap(x);
                }),
                count: count,
            };
        }
        catch (error) {
            throw error;
        }
    }
    async fetchInadequateStock(data) {
        console.log(data);
        try {
            const [result, count] = await this.prisma.$transaction([
                this.prisma.$queryRawUnsafe(`
          SELECT product.*, product_stock.stock, product_brand.name AS brand_name, product_type.name AS type_name,
          product_brand.created_by AS brand_created_by, product_type.created_by AS type_created_by
          FROM product
          LEFT JOIN product_stock ON product_stock.id = product.id
          JOIN product_brand ON product.product_brand_id = product_brand.id
          JOIN product_type ON product.product_type_id = product_type.id
          WHERE product_stock.stock < product.minimum_stock
          AND (
            product.reference LIKE '%${data.keyword}%'
            OR product.description LIKE '%${data.keyword}%'
          )
          ORDER BY product.reference ASC
          LIMIT ${data.pageSize}
          OFFSET ${(data.page - 1) * data.pageSize}
        `),
                this.prisma.$queryRawUnsafe(`
          SELECT COUNT(product.id) AS count
          FROM product
          JOIN product_stock ON product_stock.id = product.id
          WHERE product_stock.stock < product.minimum_stock
          AND (
            product.reference LIKE '%${data.keyword}%'
            OR product.description LIKE '%${data.keyword}%'
          )
        `),
            ]);
            let formattedCount = 0;
            if (count == undefined || count.length == 0) {
                formattedCount = 0;
            }
            else {
                formattedCount = Number(count[0].count);
            }
            return {
                data: result.map((x) => {
                    return new product_model_1.ProductModel({
                        id: x.id,
                        reference: x.reference,
                        description: x.description,
                        product_brand_id: x.product_brand_id,
                        product_type_id: x.product_type_id,
                        created_at: new Date(x.created_at),
                        created_by: x.created_by,
                        minimum_stock: Number(x.minimum_stock),
                        unit: x.unit,
                        product_brand: new product_brand_model_1.ProductBrandModel({
                            id: x.product_brand_id,
                            name: x.brand_name,
                            created_by: x.brand_created_by,
                        }),
                        product_type: new product_type_model_1.ProductTypeModel({
                            id: x.product_type_id,
                            name: x.type_name,
                            created_by: x.type_created_by,
                        }),
                        product_stock: {
                            product_id: x.id,
                            stock: Number(x.stock),
                        },
                    });
                }),
                count: formattedCount,
            };
        }
        catch (error) {
            throw error;
        }
    }
}
exports.ProductStockRepository = ProductStockRepository;
//# sourceMappingURL=product-stock.repository.js.map