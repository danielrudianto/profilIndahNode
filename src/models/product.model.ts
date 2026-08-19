import { IProductBrandView } from "../interfaces/product-brand.interface";
import { IProduct, IProductStock } from "../interfaces/product.interface";

import { ProductBrandViewModel } from "./product-brand.model";
import { ProductTypeViewModel, ProductTypeModel } from "./product-type.model";
import { ProductUnitModel, ProductUnitViewModel } from "./product-unit.model";

export class ProductModel {
  id?: number;
  reference: string;
  description: string;
  product_brand_id: number;
  product_type_id: number;
  created_by?: number;
  created_at?: Date;
  updated_by?: number | null;
  updated_at?: Date | null;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  is_active?: boolean = true;
  is_delete?: boolean = false;
  minimum_stock?: number;
  minimum_stock_recommendation?: number | null;
  unit: string;
  sales_price?: number;
  sales_discount?: number;
  purchase_price?: number;
  purchase_discount?: number;

  product_brand?: IProductBrandView;
  product_type?: ProductTypeModel;
  product_unit?: ProductUnitModel[] = [];

  product_stock?: ProductStockModel;
  can_delete?: boolean;

  constructor(data: IProduct) {
    this.id = data.id;
    this.reference = data.reference;
    this.description = data.description;
    this.product_brand_id = data.product_brand_id;
    this.product_type_id = data.product_type_id;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_by = data.updated_by;
    this.updated_at = data.updated_at;
    this.is_active = data.is_active;
    this.is_delete = data.is_delete;
    this.minimum_stock = data.minimum_stock;
    this.minimum_stock_recommendation = data.minimum_stock_recommendation;
    this.unit = data.unit;
    this.product_brand = data.product_brand;
    this.product_type = data.product_type;
    this.is_delete = data.is_delete;
    this.sales_price = data.sales_price;
    this.sales_discount = data.sales_discount;
    this.purchase_price = data.purchase_price;
    this.purchase_discount = data.purchase_discount;
    this.product_unit = data.product_unit;

    this.product_stock = data.product_stock;
    this.can_delete = data.can_delete;
  }

  static fromMap(data: any) {
    return new ProductModel({
      id: data.id,
      reference: data.reference,
      description: data.description,
      product_brand_id: data.product_brand_id,
      product_type_id: data.product_type_id,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_by: data.updated_by,
      updated_at: data.updated_at,
      minimum_stock: Number(data.minimum_stock),
      minimum_stock_recommendation:
        data.minimum_stock_recommendation == null
          ? null
          : Number(data.minimum_stock_recommendation),
      sales_discount: Number(data.sales_discount),
      sales_price: Number(data.sales_price),
      purchase_discount: Number(data.purchase_discount),
      purchase_price: Number(data.purchase_price),
      unit: data.unit,
      product_brand:
        data.product_brand == undefined
          ? undefined
          : ProductBrandViewModel.fromMap(data.product_brand),
      product_type:
        data.product_type == undefined
          ? undefined
          : ProductTypeViewModel.fromMap(data.product_type),
      is_delete: data.is_delete,
      is_active: data.is_active,
      product_unit:
        data.product_unit == undefined
          ? undefined
          : data.product_unit.map((x: any) => {
              return ProductUnitViewModel.fromMap(x);
            }),

      product_stock:
        data.product_stock == undefined
          ? undefined
          : ProductStockModel.fromMap(data.product_stock),
    });
  }

  static fromMeilisearch(data: any) {
    return new ProductModel({
      id: data.id,
      reference: data.reference,
      description: data.description,
      product_brand_id: data.product_brand_id,
      product_type_id: data.product_type_id,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_by: data.updated_by,
      updated_at: data.updated_at,
      minimum_stock: data.minimum_stock,
      unit: data.unit,
      product_brand: ProductBrandViewModel.fromMap(data.product_brand),
      product_type: ProductTypeViewModel.fromMap(data.product_type),
      product_unit:
        data.product_unit == undefined
          ? []
          : data.product_unit.map((x: any) => {
              return ProductUnitModel.fromMap(x);
            }),
      sales_price: Number(data.sales_price),
      sales_discount: Number(data.sales_discount),
      purchase_price: Number(data.purchase_price),
      purchase_discount: Number(data.purchase_discount),
      is_active: data.is_active,
      is_delete: data.is_delete,
    });
  }
}

export class ProductStockModel {
  id?: number;
  product_id: number;
  stock: number;

  constructor(data: IProductStock) {
    this.id = data.id;
    this.product_id = data.product_id;
    this.stock = data.stock;
  }

  static fromMap(data: any) {
    return new ProductStockModel({
      id: data.id,
      product_id: Number(data.product_id),
      stock: Number(data.stock),
    });
  }
}
