import { meili } from "../helper/meili.helper";
import { ProductBrandRepository } from "../repositories/product-brand.repository";

export class ProductBrandService {
  private productBrandRepository: ProductBrandRepository;
  constructor(productBrandRepository: ProductBrandRepository) {
    this.productBrandRepository = productBrandRepository;
  }

  update = async (id: number) => {
    const productBrand = await this.productBrandRepository.fetchByID(id);
    if (!productBrand) {
      throw new Error("Product brand not found");
    }

    const products = await meili
      .index("product")
      .search("", { filter: `product_brand_id = ${id}` });

    if (products.hits.length > 0) {
      const updatePromises = products.hits.map((product: any) => {
        return meili.index("product").updateDocuments([
          {
            id: product.id,
            name: productBrand.name,
          },
        ]);
      });
      await Promise.all(updatePromises);
    } else {
      console.warn(`No products found with brand_id ${id} to update.`);
    }
  };
}
