import { CustomerModel } from "./customer.model";
import { PaymentMethodModel } from "./payment-method.model";
import { SalesInvoiceModel } from "./sales-invoice.model";
import { UserViewModel } from "./user.model";

export interface IOverpaymentCode {
  id?: number;
  customer_id: number;
  date: Date;
  sales_deposit_code_id: number | null;
  payment_method_id: number | null;
  return_payment_method: string;
  return_payment_number: string | null;
  return_payment_date: Date;
  return_payment_bank: string | null;
  return_payment_name: string;
  created_by: number;
  created_at: Date;
  value: number;

  customer?: CustomerModel | null;
  sales_invoice?: SalesInvoiceModel;
  user_overpayment_created_byTouser?: UserViewModel;
  payment_method?: PaymentMethodModel | null;
}

export class OverpaymentCodeModel {
  id?: number;
  customer_id: number;
  date: Date;
  sales_deposit_code_id: number | null;
  payment_method_id: number | null;
  return_payment_method: string;
  return_payment_number: string | null;
  return_payment_date: Date;
  return_payment_bank: string | null;
  return_payment_name: string;
  created_by: number;
  created_at: Date;
  value: number;

  customer?: CustomerModel | null;
  user_overpayment_created_byTouser?: UserViewModel;
  payment_method?: PaymentMethodModel | null;

  constructor(data: IOverpaymentCode) {
    this.id = data.id;
    this.customer_id = data.customer_id;
    this.date = data.date;
    this.sales_deposit_code_id = data.sales_deposit_code_id;
    this.payment_method_id = data.payment_method_id;
    this.return_payment_method = data.return_payment_method;
    this.return_payment_number = data.return_payment_number;
    this.return_payment_date = data.return_payment_date;
    this.return_payment_bank = data.return_payment_bank;
    this.return_payment_name = data.return_payment_name;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.value = data.value;

    this.customer = data.customer;
    this.user_overpayment_created_byTouser =
      data.user_overpayment_created_byTouser;
    this.payment_method = data.payment_method;
  }

  static fromMap(data: any): OverpaymentCodeModel {
    return new OverpaymentCodeModel({
      id: data.id,
      customer_id: data.customer_id,
      date: new Date(data.date),
      sales_deposit_code_id: data.sales_deposit_code_id,
      payment_method_id: data.payment_method_id,
      return_payment_method: data.return_payment_method,
      return_payment_date: new Date(data.return_payment_date),
      return_payment_bank: data.return_payment_bank,
      return_payment_name: data.return_payment_name,
      return_payment_number: data.return_payment_number,
      created_by: data.created_by,
      created_at: new Date(data.created_at),
      value: Number(data.value),
      customer:
        data.customer == null
          ? null
          : data.customer == undefined
          ? undefined
          : CustomerModel.fromMap(data.customer),
      user_overpayment_created_byTouser:
        data.user_overpayment_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(data.user_overpayment_created_byTouser),
      payment_method:
        data.payment_method == null
          ? null
          : data.payment_method == undefined
          ? undefined
          : PaymentMethodModel.fromMap(data.payment_method),
    });
  }
}

export interface IOverpayment {
  id?: number;
  payment_method_id: number | null;
  value: number;
  overpayment_code_id: number;

  payment_method?: PaymentMethodModel | null;
}

export class OverpaymentModel {
  id?: number;
  payment_method_id: number | null;
  value: number;
  overpayment_code_id: number;
  payment_method?: PaymentMethodModel | null;

  constructor(data: IOverpayment) {
    this.id = data.id;
    this.payment_method_id = data.payment_method_id;
    this.value = data.value;
    this.overpayment_code_id = data.overpayment_code_id;
    this.payment_method = data.payment_method;
  }
}
