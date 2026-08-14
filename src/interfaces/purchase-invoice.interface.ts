import GoodReceiptModel from "../models/good-receipt.model";

export interface IPurchaseInvoice {
  id?: number;
  uuid: string;
  name: string;
  date: Date;
  discount: number;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  is_confirm?: boolean;
  confirmed_by?: number;
  confirmed_at?: Date;
  faktur?: string;
  good_receipt_code_id?: number;
  good_receipt_code?: GoodReceiptModel;
}
