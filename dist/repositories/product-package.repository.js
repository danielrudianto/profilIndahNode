"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPackageRepository = void 0;
const product_package_model_1 = require("../model/product-package.model");
class ProductPackageRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.package_code.create({
                data: {
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    created_by: data.created_by,
                    created_at: data.created_at,
                    package_content: {
                        createMany: {
                            data: data.package_content.map((x) => {
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
            return product_package_model_1.PackageCodeModel.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error on creating product package ${error}`);
            throw error;
        }
    }
    async update(data) {
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
            return product_package_model_1.PackageCodeModel.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error on updating product package ${error}`);
            throw error;
        }
    }
    async updateSalesPrice(data) {
        try {
            const updateData = [];
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                updateData.push(this.prisma.package_code.update({
                    where: {
                        id: item.package_code_id,
                    },
                    data: {
                        price: item.price,
                    },
                }));
            }
            // prisma transaction
            await this.prisma.$transaction(updateData);
        }
        catch (error) {
            throw error;
        }
    }
    async delete(id, userID) {
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
        }
        catch (error) {
            console.error(`[error]: Error on deleting product package ${error}`);
            throw error;
        }
    }
    async fetchByID(id) {
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
            return product_package_model_1.PackageCodeModel.fromMap(result);
        }
        catch (error) {
            console.error(`[error]: Error on fetching product package by ID ${error}`);
            throw error;
        }
    }
    async fetchAll() {
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
            return product_package_model_1.PackageCodeModel.fromMap(x);
        });
    }
}
exports.ProductPackageRepository = ProductPackageRepository;
//# sourceMappingURL=product-package.repository.js.map