"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductUnitRepository = void 0;
const product_unit_model_1 = require("../model/product-unit.model");
class ProductUnitRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        try {
            const result = await this.prisma.product_unit.createMany({
                data: data.map((unit) => {
                    return {
                        product_id: unit.product_id,
                        unit: unit.unit,
                        conversion: unit.conversion,
                        created_by: unit.created_by,
                        created_at: unit.created_at,
                        sales_price: unit.sales_price,
                        sales_discount: unit.sales_discount,
                        purchase_price: unit.purchase_price,
                        purchase_discount: unit.purchase_discount,
                    };
                }),
            });
            return result.count;
        }
        catch (error) {
            throw error;
        }
    }
    async fetchByItemID(productID) {
        try {
            const result = await this.prisma.product_unit.findMany({
                where: { product_id: productID },
            });
            return result.map((unit) => {
                return product_unit_model_1.ProductUnitModel.fromMap(unit);
            });
        }
        catch (error) {
            throw error;
        }
    }
}
exports.ProductUnitRepository = ProductUnitRepository;
//# sourceMappingURL=product-unit.repository.js.map