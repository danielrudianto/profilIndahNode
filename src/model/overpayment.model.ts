import { CustomerModel } from "./customer.model";
import { PaymentMethodModel } from "./payment-method.model";
import { SalesInvoiceModel } from "./sales-invoice.model";

export interface IOverpaymentCode {
  id?: number;
  customer_id: number;
  date: Date;
  sales_invoice_code_id: number;
  return_payment_method: string;
  return_payment_number: string | null;
  return_date: Date;
  created_by: number;
  created_at: Date;

  customer?: CustomerModel;
  sales_invoice?: SalesInvoiceModel;

  overpayment?: OverpaymentModel[];
}

export class OverpaymentCodeModel {
  id?: number;
  customer_id: number;
  date: Date;
  sales_invoice_code_id: number;
  return_payment_method: string;
  return_payment_number: string | null;
  return_date: Date;
  created_by: number;
  created_at: Date;

  constructor(data: IOverpaymentCode) {
    this.id = data.id;
    this.customer_id = data.customer_id;
    this.date = data.date;
    this.sales_invoice_code_id = data.sales_invoice_code_id;
    this.return_payment_method = data.return_payment_method;
    this.return_payment_number = data.return_payment_number;
    this.return_date = data.return_date;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
  }

  static fromMap(data: any): OverpaymentCodeModel {
    return new OverpaymentCodeModel({
      id: data.id,
      customer_id: data.customer_id,
      date: new Date(data.date),
      sales_invoice_code_id: data.sales_invoice_code_id,
      return_payment_method: data.return_payment_method,
      return_payment_number: data.return_payment_number,
      return_date: new Date(data.return_date),
      created_by: data.created_by,
      created_at: new Date(data.created_at),

      overpayment:
        data.overpayment == undefined
          ? undefined
          : data.overpayment.map((x: any) => {
              return new OverpaymentModel({
                id: x.id,
                amount: Number(x.amount),
                payment_method_id: x.payment_method_id,
                payment_method: PaymentMethodModel.fromMap(x.payment_method),
                overpayment_code_id: x.overpayment_code_id,
              });
            }),
    });
  }
}

export interface IOverpayment {
  id?: number;
  payment_method_id: number | null;
  amount: number;
  overpayment_code_id: number;

  payment_method?: PaymentMethodModel | null;
}

export class OverpaymentModel {
  id?: number;
  payment_method_id: number | null;
  amount: number;
  overpayment_code_id: number;
  payment_method?: PaymentMethodModel | null;

  constructor(data: IOverpayment) {
    this.id = data.id;
    this.payment_method_id = data.payment_method_id;
    this.amount = data.amount;
    this.overpayment_code_id = data.overpayment_code_id;
    this.payment_method = data.payment_method;
  }
}
