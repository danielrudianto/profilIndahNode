import { meili } from "../helper/meili.helper";
import { ProductPurchasePriceRepository } from "../repositories/product-purchase-price.repository";
import { ProductSalesPriceRepository } from "../repositories/product-sales-price.repository";
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
    const product = await this.productRepository.fetchByID(id);

    if (!product) {
      throw new Error("Product not found");
    }

    const productUnits = await this.productUnitRepository.fetchByItemID(id);

    const result = await meili.index("products").addDocuments([
      {
        ...product,
        item_unit: productUnits,
      },
    ]);

    return result;
  }
}
