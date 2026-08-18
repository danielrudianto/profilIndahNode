import { meili } from "../utils/meili.helper";
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

  async create(id: number) {
    try {
      const product = await this.productRepository.fetchByID(id);

      if (!product) {
        throw new Error("Product not found");
      }

      const productUnits = await this.productUnitRepository.fetchByItemID(id);
      const result = await meili.index("product").addDocuments([
        {
          ...product,
          product_unit: productUnits,
        },
      ], { primaryKey: "id" });

      return result;
    } catch (error) {
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

      const result = await meili.index("product").addDocuments(products, { primaryKey: "id" });
      return result;
      return result;
    } catch (error) {
      console.error("Error filling product index in MeiliSearch:", error);
      throw new Error("Failed to fill product index in search");
    }
  }

  async update(id: number) {
    try {
      const product = await this.productRepository.fetchByID(id);

      if (!product) {
        throw new Error("Product not found");
      }

      const productUnits = await this.productUnitRepository.fetchByItemID(id);
      const result = await meili.index("product").updateDocuments([
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

  async delete(id: number) {
    try {
      const result = await meili.index("product").deleteDocument(id.toString());
      return result;
    } catch (error) {
      console.error("Error deleting product in MeiliSearch:", error);
      throw new Error("Failed to delete product in search index");
    }
  }

  async fetchAll() {
    try {
      const products = await this.productRepository.fetchAll();
      return products;
    } catch (error) {
      throw error;
    }
  }
}
