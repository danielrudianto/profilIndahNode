import {
  IGoodReceipt,
  IGoodReceiptItem,
} from "../interfaces/good-receipt.interface";
import { CompanyModel } from "./company.model";
import { ProductModel } from "./product.model";
import { ProductUnitModel } from "./product-unit.model";
import SupplierModel from "./supplier.model";
import { UserViewModel } from "./user.model";

class GoodReceiptModel {
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
  company?: CompanyModel;
  supplier?: SupplierModel;
  is_confirm: boolean;
  is_delete: boolean;

  user_good_receipt_code_created_byTouser?: UserViewModel;
  user_good_receipt_code_confirmed_byTouser?: UserViewModel | null;

  constructor(data: IGoodReceipt) {
    this.id = data.id;
    this.uuid = data.uuid;
    this.name = data.name;
    this.invoice_name = data.invoice_name;
    this.faktur = data.faktur;
    this.discount = data.discount;
    this.date = data.date;
    this.supplier_id = data.supplier_id;
    this.company_id = data.company_id;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.good_receipt = data.good_receipt;
    this.company = data.company;
    this.supplier = data.supplier;
    this.user_good_receipt_code_created_byTouser =
      data.user_good_receipt_code_created_byTouser;
    this.user_good_receipt_code_confirmed_byTouser =
      data.user_good_receipt_code_confirmed_byTouser;
    this.is_confirm = data.is_confirm;
    this.is_delete = data.is_delete;
  }

  static fromMap(data: any) {
    return new GoodReceiptModel({
      id: data.id,
      uuid: data.uuid,
      name: data.name,
      invoice_name: data.invoice_name,
      faktur: data.faktur,
      discount: data.discount,
      date: data.date,
      supplier_id: data.supplier_id,
      company_id: data.company_id,
      created_by: data.created_by,
      created_at: data.created_at,
      is_confirm: data.is_confirm,
      is_delete: data.is_delete,
      good_receipt:
        data.good_receipt == undefined
          ? undefined
          : data.good_receipt.map((item: any) => ({
              id: item.id,
              product_id: item.product_id,
              product_unit_id: item.product_unit_id,
              quantity: Number(item.quantity),
              price: Number(item.price),
              discount: Number(item.discount),

              product:
                item.product == undefined
                  ? undefined
                  : ProductModel.fromMap(item.product),
              product_unit:
                item.product_unit == undefined
                  ? undefined
                  : item.product_unit == null
                  ? null
                  : ProductUnitModel.fromMap(item.product_unit),
            })),
      company:
        data.company == undefined ? undefined : new CompanyModel(data.company),
      supplier:
        data.supplier == undefined
          ? undefined
          : new SupplierModel(data.supplier),
      user_good_receipt_code_created_byTouser:
        data.user_good_receipt_code_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(data.user_good_receipt_code_created_byTouser),
      user_good_receipt_code_confirmed_byTouser:
        data.user_good_receipt_code_confirmed_byTouser == undefined
          ? undefined
          : data.user_good_receipt_code_confirmed_byTouser == null
          ? null
          : UserViewModel.fromMap(
              data.user_good_receipt_code_confirmed_byTouser
            ),
    });
  }
}

export default GoodReceiptModel;
