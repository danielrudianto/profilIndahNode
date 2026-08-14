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
