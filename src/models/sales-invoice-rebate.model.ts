import { ISalesInvoiceRebate } from "../interfaces/sales-invoice-rebate.interface";
import { PaymentMethodViewModel } from "./payment-method.model";

export class SalesInvoiceRebateModel {
  id?: number;
  sales_invoice_code_id: number;
  value: number;
  payment_method_id: number | null;
  date: Date;
  receiver_name: string;
  bank_name: string | null;
  account_number: string | null;
  created_by: number;
  created_at?: Date;

  payment_method?: any;

  constructor(data: ISalesInvoiceRebate) {
    this.id = data.id;
    this.sales_invoice_code_id = data.sales_invoice_code_id;
    this.value = data.value;
    this.payment_method_id = data.payment_method_id;
    this.date = data.date;
    this.receiver_name = data.receiver_name;
    this.bank_name = data.bank_name;
    this.account_number = data.account_number;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.payment_method = data.payment_method;
  }

  static fromMap(data: any): SalesInvoiceRebateModel {
    return new SalesInvoiceRebateModel({
      id: data.id,
      sales_invoice_code_id: data.sales_invoice_code_id,
      value: Number(data.value),
      payment_method_id: data.payment_method_id,
      date: new Date(data.date),
      receiver_name: data.receiver_name,
      bank_name: data.bank_name,
      account_number: data.account_number,
      created_by: data.created_by,
      created_at: data.created_at ? new Date(data.created_at) : undefined,
      payment_method:
        data.payment_method == null
          ? null
          : new PaymentMethodViewModel({
              id: data.payment_method.id,
              name: data.payment_method.name,
              description: data.payment_method.description,
            }),
    });
  }
}
