interface IStockCard {
  id?: number;
  date: Date;
  product_id: number;
  display_quantity: number;
  quantity: number;
  unit: string;
  name: string; // Name of the document
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
}

class StockCardModel {
  id?: number;
  date: Date;
  product_id: number;
  display_quantity: number;
  quantity: number;
  unit: string;
  name: string; // Name of the document;
  supplier_id: number | null;
  customer_id: number | null;

  sales_invoice_id: number | null;
  sales_invoice_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  good_receipt_id: number | null;
  good_receipt_code_id: number | null;

  constructor(data: IStockCard) {
    this.id = data.id;
    this.date = data.date;
    this.product_id = data.product_id;
    this.display_quantity = data.display_quantity;
    this.quantity = data.quantity;
    this.unit = data.unit;
    this.name = data.name;
    this.supplier_id = data.supplier_id;
    this.customer_id = data.customer_id;
    this.sales_invoice_id = data.sales_invoice_id;
    this.sales_invoice_code_id = data.sales_invoice_code_id;
    this.adjustment_case_code_id = data.adjustment_case_code_id;
    this.adjustment_case_id = data.adjustment_case_id;
    this.good_receipt_id = data.good_receipt_id;
    this.good_receipt_code_id = data.good_receipt_code_id;
  }
}
