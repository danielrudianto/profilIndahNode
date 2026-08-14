import { IPromotion } from "../interfaces/promotion.interface";
import { ProductBrandModel } from "./product-brand.model";
import SupplierModel from "./supplier.model";
import { UserViewModel } from "./user.model";

class PromotionModel {
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
  }[];
  promotion_brand?: {
    id?: number;
    product_brand_id: number;
    product_brand?: ProductBrandModel;
    promotion_code_id?: number;
  }[];
  supplier_id: number;
  supplier?: SupplierModel;
  promotion_code_created_by?: UserViewModel;
  promotion_code_updated_by?: UserViewModel | null;
  promotion_code_deleted_by?: UserViewModel | null;
  is_delete: boolean;
  deleted_by: number | null;
  deleted_at: Date | null;

  constructor(data: IPromotion) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.target = data.target;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.promotion_rules =
      data.promotion_rules == undefined
        ? undefined
        : data.promotion_rules.map((rule) => ({
            id: rule.id,
            rule: rule.rule,
            value: rule.value,
          }));
    this.promotion_brand =
      data.promotion_brand == undefined
        ? undefined
        : data.promotion_brand.map((brand) => {
            return {
              id: brand.id,
              product_brand_id: brand.product_brand_id,
              product_brand: brand.product_brand
                ? ProductBrandModel.fromMap(brand.product_brand)
                : undefined,
              promotion_code_id: brand.promotion_code_id,
            };
          });

    this.supplier_id = data.supplier_id;
    this.supplier = data.supplier;
    this.is_delete = data.is_delete;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;

    this.promotion_code_created_by = data.promotion_code_created_by;
    this.promotion_code_updated_by = data.promotion_code_updated_by;
    this.promotion_code_deleted_by = data.promotion_code_deleted_by;
  }

  static fromMap(data: any): PromotionModel {
    return new PromotionModel({
      id: data.id,
      name: data.name,
      description: data.description,
      startDate: new Date(data.start),
      endDate: data.end == null ? null : new Date(data.end),
      target: Number(data.target),
      created_by: data.created_by,
      created_at: data.created_at,
      promotion_rules:
        data.promotion_rules != undefined
          ? data.promotion_rules.map((rule: any) => ({
              id: rule.id,
              rule: rule.rule,
              value: rule.value,
            }))
          : undefined,
      promotion_brand:
        data.promotion_brand != undefined
          ? data.promotion_brand.map((brand: any) => ({
              id: brand.id,
              product_brand_id: brand.product_brand_id,
              product_brand: brand.product_brand
                ? ProductBrandModel.fromMap(brand.product_brand)
                : undefined,
              promotion_code_id: brand.promotion_code_id,
            }))
          : undefined,
      supplier_id: data.supplier_id,
      supplier: data.supplier
        ? SupplierModel.fromMap(data.supplier)
        : undefined,
      is_delete: data.is_delete,
      deleted_by: data.deleted_by,
      deleted_at: data.deleted_at ? new Date(data.deleted_at) : null,
      promotion_code_created_by: data.promotion_code_created_by
        ? UserViewModel.fromMap(data.promotion_code_created_by)
        : undefined,
      promotion_code_updated_by: data.promotion_code_updated_by
        ? UserViewModel.fromMap(data.promotion_code_updated_by)
        : null,
      promotion_code_deleted_by: data.promotion_code_deleted_by
        ? UserViewModel.fromMap(data.promotion_code_deleted_by)
        : null,
    });
  }
}

export default PromotionModel;
