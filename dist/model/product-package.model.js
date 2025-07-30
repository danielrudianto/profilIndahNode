"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageCodeModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PackageCodeModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.price = data.price;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.package_content = data.package_content;
        this.is_delete = data.is_delete;
    }
    static fromMap(data) {
        return new PackageCodeModel({
            id: data.id,
            name: data.name,
            description: data.description,
            price: Number(data.price),
            created_by: data.created_by,
            created_at: data.created_at,
            is_delete: data.is_delete,
            package_content: data.package_content.map((content) => ({
                id: content.id,
                product_id: content.product_id,
                product_unit_id: content.product_unit_id,
                quantity: Number(content.quantity),
                price: Number(content.price),
                discount: Number(content.discount),
                package_code_id: content.package_code_id,
                // item can be undefined
                product: content.product
                    ? {
                        id: content.product.id,
                        reference: content.product.reference,
                        description: content.product.description,
                        unit: content.product.unit,
                    }
                    : undefined,
                product_unit: content.product_unit
                    ? {
                        id: content.product_unit.id,
                        conversion: Number(content.product_unit.conversion),
                        unit: content.product_unit.unit,
                    }
                    : undefined,
            })),
        });
    }
}
exports.PackageCodeModel = PackageCodeModel;
//# sourceMappingURL=product-package.model.js.map