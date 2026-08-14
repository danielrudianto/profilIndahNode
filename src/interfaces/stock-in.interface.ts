export interface StockInInterface {
  itemID: number;
  createdAt: Date;
  date: Date;
  document: string;
  opponent: string;
  displayQuantity: number;
  unit: string;
  quantity: number;
  billID: number | null;
  billCodeID: number | null;
  adjustmentCaseID: number | null;
  adjustmentCaseCodeID: number | null;
  goodReceiptID: number | null;
  goodReceiptCodeID: number | null;
  salesReturnID: number | null;
  salesReturnCodeID: number | null;
  customerID: number | null;
  supplierID: number | null;
  companyID: number | null;
  price: number;
}

export interface StockReturnInterface {
  itemID: number;
  createdAt: Date;
  date: Date;
  document: string;
  opponent: string;
  displayQuantity: number;
  unit: string;
  quantity: number;
  billID: number | null;
  billCodeID: number | null;
  salesReturnID: number | null;
  salesReturnCodeID: number | null;
  customerID: number | null;
}

export interface StockOutDeleteInterface {
  itemID: number;
  billID: number | null;
  adjustmentCaseID: number | null;
  quantity: number;
}

export interface StockInUpdateInterface {
  itemID: number;
  goodReceiptID: number;
  goodReceiptCodeID: number;
  price: number;
}

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
