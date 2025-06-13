import { meili } from "../helper/meili.helper";
import { ProductUnitRepository } from "../repositories/product-unit.repository";
import { ProductRepository } from "../repositories/product.repository";

export class ProductService {
  private productRepository: ProductRepository;
  private productUnitRepository: ProductUnitRepository;

  constructor(
    productRepository: ProductRepository,
    productUnitRepository: ProductUnitRepository
  ) {
    this.productRepository = productRepository;
    this.productUnitRepository = productUnitRepository;
  }

  async createProduct(id: number) {
    try {
      const product = await this.productRepository.fetchByID(id);

      if (!product) {
        throw new Error("Product not found");
      }

      const productUnits = await this.productUnitRepository.fetchByItemID(id);
      const result = await meili.index("product").addDocuments([
        {
          ...product,
          item_unit: productUnits,
        },
      ]);

      return result;
    } catch (error) {
      console.error("Error creating product in MeiliSearch:", error);
      throw new Error("Failed to create product in search index");
    }
  }
}
