import { IProductTypeView } from ".//product-type.interface";
import { IProductBrandView } from ".//product-brand.interface";
import { ProductStockModel } from "../models/product.model";
import { ProductUnitModel } from "../models/product-unit.model";

export interface IProduct {
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
  minimum_stock?: number;
  unit: string;
  sales_price?: number;
  sales_discount?: number;
  purchase_price?: number;
  purchase_discount?: number;
  is_active?: boolean;
  is_delete?: boolean;

  product_type?: IProductTypeView;
  product_brand?: IProductBrandView;
  product_unit?: ProductUnitModel[];

  product_stock?: ProductStockModel;
  can_delete?: boolean;
}

export interface IPriceProduct {
  product_id: number;
  product_unit_id: number | null;
  price: number;
  discount: number;
}

export interface IProductStock {
  id?: number;
  product_id: number;
  stock: number;
}
