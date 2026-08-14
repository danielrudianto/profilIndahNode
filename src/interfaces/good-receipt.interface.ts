import GoodReceiptModel from "../models/good-receipt.model";
import { CompanyModel } from "../models/company.model";
import { ProductModel } from "../models/product.model";
import { ProductUnitModel } from "../models/product-unit.model";
import SupplierModel from "../models/supplier.model";
import { UserViewModel } from "../models/user.model";

export interface IGoodReceipt {
  id?: number;
  uuid: string;
  name: string;
  invoice_name: string;
  faktur: string | null;
  discount: number;
  date: Date;
  supplier_id: number;
  company_id: number;
  created_by?: number;
  created_at?: Date;
  confirmed_by?: number | null;
  confirmed_at?: Date | null;
  good_receipt?: IGoodReceiptItem[];

  is_confirm: boolean;
  is_delete: boolean;

  company?: CompanyModel;
  supplier?: SupplierModel;

  user_good_receipt_code_created_byTouser?: UserViewModel;
  user_good_receipt_code_confirmed_byTouser?: UserViewModel | null;
}

export interface IGoodReceiptItem {
  id?: number;
  good_receipt_id?: number;
  product_id: number;
  product_unit_id: number;
  quantity: number;
  price: number;
  discount: number;

  product?: ProductModel;
  product_unit?: ProductUnitModel;
  good_receipt_code?: GoodReceiptModel;
}
