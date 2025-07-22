export interface IStockIn {
  id?: number;
  date: Date;
  company_id: number;
  quantity: number;
  price: number;
  good_receipt_id: number | null;
  good_receipt_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  product_id: number;
}

export interface IStockInUpdate {
  good_receipt_id: number | null;
  good_receipt_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  price: number;
}

export class StockInModel {
  id?: number;
  date: Date;
  company_id: number;
  quantity: number;
  price: number;
  good_receipt_id: number | null;
  good_receipt_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  product_id: number;
  residue: number;
  // initialize the model with default values
  constructor(data: IStockIn) {
    this.id = data.id;
    this.date = data.date;
    this.company_id = data.company_id;
    this.quantity = data.quantity;
    this.price = data.price;
    this.good_receipt_id = data.good_receipt_id;
    this.good_receipt_code_id = data.good_receipt_code_id;
    this.adjustment_case_id = data.adjustment_case_id;
    this.adjustment_case_code_id = data.adjustment_case_code_id;
    this.product_id = data.product_id;
    this.residue = data.quantity;
  }
}
