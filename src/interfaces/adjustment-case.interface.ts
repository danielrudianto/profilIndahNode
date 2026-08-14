import { UserViewModel } from "../models/user.model";
import { ProductModel } from "../models/product.model";
import { ProductUnitViewModel } from "../models/product-unit.model";
import { CompanyModel } from "../models/company.model";

export interface IAdjustmentCaseCode {
  id?: number;
  name: string;
  date: Date;
  created_by?: number;
  created_at?: Date;
  is_confirm?: boolean;
  is_delete?: boolean;
  confirmed_by?: number | null;
  confirmed_at?: Date | null;

  company_id: number | null;
  adjustment_case: IAdjustmentCase[];
  user_adjustment_case_code_created_byTouser?: UserViewModel;

  company?: CompanyModel | null;
}

export interface IAdjustmentCase {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;

  product?: ProductModel;
  product_unit?: ProductUnitViewModel | null;
}
