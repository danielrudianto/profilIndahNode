"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPackageService = void 0;
const meili_helper_1 = require("../helper/meili.helper");
class ProductPackageService {
    constructor(productPackageRepository) {
        this.productPackageRepository = productPackageRepository;
    }
    async fetchAll() {
        try {
            const packages = await this.productPackageRepository.fetchAll();
            return packages;
        }
        catch (error) {
            throw error;
        }
    }
    async update(id) {
        try {
            const productPackage = await this.productPackageRepository.fetchByID(id);
            if (!productPackage) {
                throw Error("Package not found");
            }
            meili_helper_1.meili.index("package").updateDocuments([productPackage]);
        }
        catch (error) {
            throw error;
        }
    }
}
exports.ProductPackageService = ProductPackageService;
//# sourceMappingURL=package.service.js.map