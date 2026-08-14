import { ProductUnitRepository } from "../repositories/product-unit.repository";

export class ProductUnitController {
  private productUnitRepository: ProductUnitRepository;

  constructor(productUnitRepository: ProductUnitRepository) {
    this.productUnitRepository = productUnitRepository;
  }
}
