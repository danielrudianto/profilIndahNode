"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const database_helper_1 = require("../helper/database.helper");
const meili_helper_1 = require("../helper/meili.helper");
const product_package_repository_1 = require("../repositories/product-package.repository");
const product_unit_repository_1 = require("../repositories/product-unit.repository");
const product_repository_1 = require("../repositories/product.repository");
const package_service_1 = require("../services/package.service");
const product_service_1 = require("../services/product.service");
const productService = new product_service_1.ProductService(new product_repository_1.ProductRepository(database_helper_1.prisma), new product_unit_repository_1.ProductUnitRepository(database_helper_1.prisma));
const packageService = new package_service_1.ProductPackageService(new product_package_repository_1.ProductPackageRepository(database_helper_1.prisma));
const main = async () => {
    // remove all documents in the index of product
    await meili_helper_1.meili.index("product").deleteAllDocuments();
    const products = await productService.fetchAll();
    // add all products to meili
    await meili_helper_1.meili.index("product").addDocuments(products);
    await meili_helper_1.meili.index("package").deleteAllDocuments();
    const packages = await packageService.fetchAll();
    await meili_helper_1.meili.index("package").addDocuments(packages);
};
exports.main = main;
(0, exports.main)();
//# sourceMappingURL=meilisearch.setup.js.map