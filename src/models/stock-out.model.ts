import { StockInModel } from "./stock-in.model";

export interface IStockoutModel {
  id?: number;
  date: Date;
  product_id: number;
  quantity: number;
  sales_invoice_id: number | null;
  sales_invoice_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  stock_in_id: number | null;
  price: number;
}

export class StockOutModel {
  id?: number;
  product_id: number;
  quantity: number;
  sales_invoice_id: number | null;
  sales_invoice_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  date: Date;
  stock_in_id: number | null;
  stock_in?: StockInModel;
  price: number;

  // initialize the model with default values
  constructor(data: IStockoutModel) {
    this.id = data.id;
    this.product_id = data.product_id;
    this.quantity = data.quantity;
    this.sales_invoice_id = data.sales_invoice_id || null;
    this.sales_invoice_code_id = data.sales_invoice_code_id || null;
    this.adjustment_case_id = data.adjustment_case_id || null;
    this.adjustment_case_code_id = data.adjustment_case_code_id || null;
    this.date = data.date;
    this.stock_in_id = data.stock_in_id || null;
    this.price = data.price || 0; // default value for value
  }
}
