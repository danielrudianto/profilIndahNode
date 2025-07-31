"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductBrandRepository = void 0;
const product_brand_model_1 = require("../model/product-brand.model");
const user_model_1 = require("../model/user.model");
class ProductBrandRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.product_brand.create({
                data: {
                    name: data.name,
                    created_by: data.created_by,
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            username: true,
                            role: true,
                        },
                    },
                },
            });
            return new product_brand_model_1.ProductBrandModel({
                id: result.id,
                name: result.name,
                created_by: result.created_by,
                created_at: result.created_at,
                user: user_model_1.UserViewModel.fromMap(result.user),
            });
        }
        catch (error) {
            throw error;
        }
    }
    update(data) {
        return this.prisma.product_brand.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.name,
                updated_by: data.created_by,
                updated_at: data.created_at,
            },
        });
    }
    delete(id, userID) {
        return this.prisma.product_brand.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                deleted_by: userID,
                deleted_at: new Date(),
            },
        });
    }
    async fetch(data) {
        const baseQuery = `
        SELECT  product_brand.id, product_brand.name, user.name AS user_name,
                user.username AS user_username, user.role AS user_role, 
                product_brand.created_at, product_brand.created_by, 
                IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete, 
                product_brand.is_delete
        FROM product_brand
        LEFT JOIN (
            SELECT COUNT(id) AS count, product_brand_id
            FROM product
            WHERE product.is_delete = 0
            GROUP BY product_brand_id
        ) itemCount ON product_brand.id = itemCount.product_brand_id
        JOIN user ON product_brand.created_by = user.id
        WHERE product_brand.is_delete = 0
    `;
        const keywordCondition = data.keyword
            ? `AND product_brand.name LIKE '%${data.keyword}%'`
            : "";
        const query = `
      ${baseQuery}
      ${keywordCondition}
      ORDER BY product_brand.name ASC
      LIMIT ${data.pageSize}
      OFFSET ${(data.page - 1) * data.pageSize}
    `;
        const countCondition = Object.assign({ is_delete: false }, (data.keyword && { name: { contains: data.keyword } }));
        const [result, count] = await this.prisma.$transaction([
            this.prisma.$queryRawUnsafe(query),
            this.prisma.product_brand.count({ where: countCondition }),
        ]);
        return {
            data: result.map((x) => {
                return new product_brand_model_1.ProductBrandModel({
                    id: x.id,
                    name: x.name,
                    created_by: x.created_by,
                    created_at: x.created_at,
                    can_delete: x.can_delete,
                    user: user_model_1.UserViewModel.fromMap({
                        id: x.created_by,
                        name: x.user_name,
                        username: x.user_username,
                        role: x.user_role,
                    }),
                    is_delete: x.is_delete,
                });
            }),
            count: count,
        };
    }
    async fetchByName(name) {
        const result = await this.prisma.product_brand.findFirst({
            where: {
                name: name,
                is_delete: false,
            },
        });
        if (!result) {
            return null;
        }
        return new product_brand_model_1.ProductBrandModel({
            name: result.name,
            id: result.id,
            created_by: result.created_by,
            created_at: result.created_at,
        });
    }
    async fetchAutocomplete(keyword) {
        const result = await this.prisma.product_brand.findMany({
            where: {
                name: {
                    contains: keyword,
                },
                is_delete: false,
            },
            skip: 0,
            take: 5,
            orderBy: {
                name: "asc",
            },
        });
        return result.map((item) => {
            return new product_brand_model_1.ProductBrandModel({
                id: item.id,
                name: item.name,
                created_by: item.created_by,
                created_at: item.created_at,
            });
        });
    }
    async fetchByID(id) {
        const result = await this.prisma.$queryRaw `
        SELECT product_brand.id, product_brand.name, user.name AS user_name, 
        user.username AS user_username, user.role AS user_role,
        product_brand.created_at, product_brand.created_by, product_brand.is_delete, 
        IF(COALESCE(itemCount.count, 0) = 0, "1", "0") AS can_delete
        FROM product_brand
        LEFT JOIN user ON user.id = product_brand.created_by
        LEFT JOIN (
        SELECT COUNT(id) AS count, product_brand_id 
        FROM product 
        WHERE is_delete = 0 
        GROUP BY product_brand_id
        ) itemCount ON itemCount.product_brand_id = product_brand.id
        WHERE product_brand.id = ${id}
    `;
        if (result.length === 0) {
            return null;
        }
        const brandData = result[0];
        return new product_brand_model_1.ProductBrandModel({
            id: brandData.id,
            name: brandData.name,
            created_by: brandData.created_by,
            created_at: brandData.created_at,
            can_delete: brandData.can_delete,
            user: user_model_1.UserViewModel.fromMap({
                id: brandData.created_by,
                name: brandData.user_name,
                username: brandData.user_username,
                role: brandData.user_role,
            }),
        });
    }
}
exports.ProductBrandRepository = ProductBrandRepository;
//# sourceMappingURL=product-brand.repository.js.map