import { CustomerModel } from "../models/customer.model";
import { PaymentMethodModel } from "../models/payment-method.model";
import { SalesInvoiceModel } from "../models/sales-invoice.model";
import { UserViewModel } from "../models/user.model";

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

export interface IOverpayment {
  id?: number;
  payment_method_id: number | null;
  value: number;
  overpayment_code_id: number;

  payment_method?: PaymentMethodModel | null;
}
