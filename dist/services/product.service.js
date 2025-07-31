"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const meili_helper_1 = require("../helper/meili.helper");
class ProductService {
    constructor(productRepository, productUnitRepository) {
        this.productRepository = productRepository;
        this.productUnitRepository = productUnitRepository;
    }
    async create(id) {
        try {
            const product = await this.productRepository.fetchByID(id);
            if (!product) {
                throw new Error("Product not found");
            }
            const productUnits = await this.productUnitRepository.fetchByItemID(id);
            const result = await meili_helper_1.meili.index("product").addDocuments([
                Object.assign(Object.assign({}, product), { product_unit: productUnits }),
            ]);
            return result;
        }
        catch (error) {
            console.error("Error creating product in MeiliSearch:", error);
            throw new Error("Failed to create product in search index");
        }
    }
    async fillProductIndex() {
        try {
            const products = await this.productRepository.fetchAll();
            if (!products || products.length === 0) {
                throw new Error("No products found");
            }
            const result = await meili_helper_1.meili.index("product").addDocuments(products);
            return result;
            return result;
        }
        catch (error) {
            console.error("Error filling product index in MeiliSearch:", error);
            throw new Error("Failed to fill product index in search");
        }
    }
    async update(id) {
        try {
            const product = await this.productRepository.fetchByID(id);
            if (!product) {
                throw new Error("Product not found");
            }
            const productUnits = await this.productUnitRepository.fetchByItemID(id);
            const result = await meili_helper_1.meili.index("product").updateDocuments([
                Object.assign(Object.assign({}, product), { item_unit: productUnits }),
            ]);
            return result;
        }
        catch (error) {
            console.error("Error creating product in MeiliSearch:", error);
            throw new Error("Failed to create product in search index");
        }
    }
    async delete(id) {
        try {
            const result = await meili_helper_1.meili.index("product").deleteDocument(id.toString());
            return result;
        }
        catch (error) {
            console.error("Error deleting product in MeiliSearch:", error);
            throw new Error("Failed to delete product in search index");
        }
    }
    async fetchAll() {
        try {
            const products = await this.productRepository.fetchAll();
            return products;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.ProductService = ProductService;
//# sourceMappingURL=product.service.js.map