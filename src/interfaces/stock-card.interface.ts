import { CustomerModel } from "../models/customer.model";
import { ProductUnitModel } from "../models/product-unit.model";
import SupplierModel from "../models/supplier.model";

export interface IStockCard {
  id?: number;
  date: Date;
  product_id: number;
  product_unit_id: number | null;
  display_quantity: number;
  quantity: number;

  stock: number | null;

  document_name: string; // Name of the document
  supplier_id: number | null;
  customer_id: number | null;

  sales_invoice_id: number | null;
  sales_invoice_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  good_receipt_id: number | null;
  good_receipt_code_id: number | null;
  sales_return_id: number | null;
  sales_return_code_id: number | null;

  customer?: CustomerModel | null;
  supplier?: SupplierModel | null;

  created_at: Date;
  product_unit?: ProductUnitModel | null;
}
