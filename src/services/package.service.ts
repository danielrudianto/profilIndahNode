import { meili } from "../helper/meili.helper";
import { ProductPackageRepository } from "../repositories/product-package.repository";

export class ProductPackageService {
  private productPackageRepository: ProductPackageRepository;

  constructor(productPackageRepository: ProductPackageRepository) {
    this.productPackageRepository = productPackageRepository;
  }

  async fetchAll() {
    try {
      const packages = await this.productPackageRepository.fetchAll();
      return packages;
    } catch (error) {
      throw error;
    }
  }

  async update(id: number) {
    try {
      const productPackage = await this.productPackageRepository.fetchByID(id);
      if (!productPackage) {
        throw Error("Package not found");
      }

      await meili.index("package").updateDocuments([productPackage]);
    } catch (error) {
      throw error;
    }
  }
}
