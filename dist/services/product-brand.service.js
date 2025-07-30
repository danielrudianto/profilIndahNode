"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductBrandService = void 0;
const meili_helper_1 = require("../helper/meili.helper");
class ProductBrandService {
    constructor(productBrandRepository) {
        this.update = async (id) => {
            const productBrand = await this.productBrandRepository.fetchByID(id);
            if (!productBrand) {
                throw new Error("Product brand not found");
            }
            const products = await meili_helper_1.meili
                .index("product")
                .search("", { filter: `product_brand_id = ${id}` });
            if (products.hits.length > 0) {
                const updatePromises = products.hits.map((product) => {
                    return meili_helper_1.meili.index("product").updateDocuments([
                        {
                            id: product.id,
                            name: productBrand.name,
                        },
                    ]);
                });
                await Promise.all(updatePromises);
            }
            else {
                console.warn(`No products found with brand_id ${id} to update.`);
            }
        };
        this.productBrandRepository = productBrandRepository;
    }
}
exports.ProductBrandService = ProductBrandService;
//# sourceMappingURL=product-brand.service.js.map