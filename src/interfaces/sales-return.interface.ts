import { SalesReturnModel } from "../models/sales-return.model";
import { SalesReturnCodeModel } from "../models/sales-return.model";
import { PaymentMethodModel } from "../models/payment-method.model";
import {
  SalesInvoiceItemModel,
  SalesInvoiceModel,
} from "../models/sales-invoice.model";
import { UserViewModel } from "../models/user.model";

export interface ISalesReturnCode {
  id?: number;
  name: string;
  date: Date;
  payment_method_id: number | null;
  created_by: number;
  created_at: Date;
  is_confirm: boolean;
  is_delete: boolean;
  confirmed_by: number | null;
  confirmed_at: Date | null;
  sales_invoice_code_id: number;

  sales_return?: SalesReturnModel[];
  sales_invoice_code?: SalesInvoiceModel;

  user_sales_return_code_created_byTouser?: UserViewModel;
  payment_method?: PaymentMethodModel | null;
}

export interface ISalesReturn {
  id?: number;
  quantity: number;
  sales_return_code_id?: number;
  sales_invoice_id: number;

  sales_invoice?: SalesInvoiceItemModel;
  sales_return_code?: SalesReturnCodeModel;
}
