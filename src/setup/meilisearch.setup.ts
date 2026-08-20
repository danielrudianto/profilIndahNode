import { prisma } from "../utils/database.helper";
import { meili, meiliSiap } from "../utils/meili.helper";
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
  /*
    Inisialisasi indeks berjalan saat modul dimuat, TANPA ditunggu siapa pun.
    Pada server yang indeksnya belum ada, baris di bawah bisa mendahuluinya
    dan gagal dengan "Index `product` not found" — bukan karena indeksnya
    tidak akan dibuat, melainkan karena ia belum sempat.
  */
  await meiliSiap;

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
