import { CustomerModel } from "./customer.model";
import SupplierModel from "./supplier.model";

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
}

export class StockCardModel {
  id?: number;
  date: Date;
  product_id: number;
  product_unit_id: number | null;
  display_quantity: number;
  stock: number | null;
  quantity: number;
  document_name: string; // Name of the document;
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

  constructor(data: IStockCard) {
    this.id = data.id;
    this.date = data.date;
    this.product_id = data.product_id;
    this.product_unit_id = data.product_unit_id;
    this.display_quantity = data.display_quantity;
    this.quantity = data.quantity;
    this.stock = data.stock;
    this.document_name = data.document_name;
    this.supplier_id = data.supplier_id;
    this.customer_id = data.customer_id;
    this.sales_invoice_id = data.sales_invoice_id;
    this.sales_invoice_code_id = data.sales_invoice_code_id;
    this.adjustment_case_code_id = data.adjustment_case_code_id;
    this.adjustment_case_id = data.adjustment_case_id;
    this.good_receipt_id = data.good_receipt_id;
    this.good_receipt_code_id = data.good_receipt_code_id;
    this.sales_return_id = data.sales_return_id;
    this.sales_return_code_id = data.sales_return_code_id;

    this.customer = data.customer;
    this.supplier = data.supplier;
  }

  static fromMap(x: any): StockCardModel {
    return new StockCardModel({
      id: x.id,
      date: new Date(x.date),
      product_id: x.product_id,
      product_unit_id: x.product_unit_id,
      quantity: Number(x.quantity),
      display_quantity: Number(x.display_quantity),
      stock: x.stock == null ? null : Number(x.stock),
      document_name: x.document_name,
      supplier_id: x.supplier_id,
      customer_id: x.customer_id,
      sales_invoice_id: x.sales_invoice_id,
      sales_invoice_code_id: x.sales_invoice_code_id,
      adjustment_case_code_id: x.adjustment_case_code_id,
      adjustment_case_id: x.adjustment_case_id,
      good_receipt_id: x.good_receipt_id,
      good_receipt_code_id: x.good_receipt_code_id,
      sales_return_id: x.sales_return_id,
      sales_return_code_id: x.sales_return_code_id,
      customer:
        x.customer == undefined
          ? undefined
          : x.customer == null
          ? null
          : CustomerModel.fromMap(x.customer),
      supplier:
        x.supplier == undefined
          ? undefined
          : x.supplier == null
          ? null
          : SupplierModel.fromMap(x.supplier),
    });
  }
}
