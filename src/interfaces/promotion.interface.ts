import { ProductBrandModel } from "../models/product-brand.model";
import SupplierModel from "../models/supplier.model";
import { UserViewModel } from "../models/user.model";

export interface IPromotion {
  id?: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  target: number;
  created_by: number;
  created_at: Date;
  promotion_rules?: {
    id?: number;
    rule: string;
    value: string;
    promotion_code_id?: number;
  }[];
  promotion_brand?: {
    id?: number;
    product_brand_id: number;
    product_brand?: ProductBrandModel;
    promotion_code_id?: number;
  }[];
  supplier_id: number;
  supplier?: SupplierModel;
  is_delete: boolean;
  deleted_by: number | null;
  deleted_at: Date | null;
  promotion_code_created_by?: UserViewModel;
  promotion_code_updated_by?: UserViewModel | null;
  promotion_code_deleted_by?: UserViewModel | null;
}
