import { meili } from "../app";
import { ProductPurchasePriceRepository } from "../repositories/product-purchase-price.repository";
import { ProductSalesPriceRepository } from "../repositories/product-sales-price.repository";
import { ProductUnitRepository } from "../repositories/product-unit.repository";
import { ProductRepository } from "../repositories/product.repository";

export class ProductService {
  productRepository: ProductRepository;
  productUnitRepository: ProductUnitRepository;
  productSalesPriceRepository: ProductSalesPriceRepository;
  productPurchasePriceRepository: ProductPurchasePriceRepository;
  constructor(
    productRepository: ProductRepository,
    productUnitRepository: ProductUnitRepository,
    productSalesPriceRepository: ProductSalesPriceRepository,
    productPurchasePriceRepository: ProductPurchasePriceRepository
  ) {
    this.productPurchasePriceRepository = productPurchasePriceRepository;
    this.productRepository = productRepository;
    this.productUnitRepository = productUnitRepository;
    this.productSalesPriceRepository = productSalesPriceRepository;
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
