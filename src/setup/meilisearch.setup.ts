import { prisma } from "../utils/database.helper";
import { meili } from "../utils/meili.helper";
import { ProductPackageRepository } from "../repositories/product-package.repository";
import { ProductUnitRepository } from "../repositories/product-unit.repository";
import { ProductRepository } from "../repositories/product.repository";
import { ProductPackageService } from "../services/package.service";
import { ProductService } from "../services/product.service";

const productService = new ProductService(
  new ProductRepository(prisma),
  new ProductUnitRepository(prisma)
);

const packageService = new ProductPackageService(
  new ProductPackageRepository(prisma)
);

export const main = async () => {
  // remove all documents in the index of product
  await meili.index("product").deleteAllDocuments();
  const products = await productService.fetchAll();

  // add all products to meili
  await meili.index("product").addDocuments(products, { primaryKey: "id" });

  await meili.index("package").deleteAllDocuments();
  const packages = await packageService.fetchAll();

  await meili.index("package").addDocuments(packages, { primaryKey: "id" });
};

main();
