import {
  ISalesReturnCode,
  ISalesReturn,
} from "../interfaces/sales-return.interface";
import { PaymentMethodModel } from "./payment-method.model";
import {
  SalesInvoiceItemModel,
  SalesInvoiceModel,
} from "./sales-invoice.model";
import { UserViewModel } from "./user.model";

export class SalesReturnCodeModel {
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
  sales_invoice_code?: SalesInvoiceModel;

  payment_method?: PaymentMethodModel | null;
  sales_return?: SalesReturnModel[];

  user_sales_return_code_created_byTouser?: UserViewModel;

  constructor(data: ISalesReturnCode) {
    this.id = data.id;
    this.name = data.name;
    this.date = data.date;
    this.payment_method_id = data.payment_method_id;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.is_confirm = data.is_confirm;
    this.is_delete = data.is_delete;
    this.confirmed_at = data.confirmed_at;
    this.confirmed_by = data.confirmed_by;
    this.sales_invoice_code_id = data.sales_invoice_code_id;

    this.sales_invoice_code = data.sales_invoice_code;
    this.sales_return = data.sales_return;

    this.user_sales_return_code_created_byTouser =
      data.user_sales_return_code_created_byTouser;
    this.payment_method = data.payment_method;
  }

  static fromMap(data: any) {
    return new SalesReturnCodeModel({
      id: data.id,
      name: data.name,
      date: new Date(data.date),
      payment_method_id: data.payment_method_id,
      created_by: data.created_by,
      created_at: new Date(data.created_at),
      is_confirm: data.is_confirm,
      is_delete: data.is_delete,
      confirmed_at: new Date(data.confirmed_at),
      confirmed_by: data.confirmed_by,
      sales_invoice_code_id: data.sales_invoice_code_id,
      sales_invoice_code:
        data.sales_invoice_code == undefined
          ? undefined
          : SalesInvoiceModel.fromMap(data.sales_invoice_code),
      sales_return:
        data.sales_return == undefined
          ? undefined
          : data.sales_return.map((x: any) => {
              return {
                quantity: Number(x.quantity),
                sales_invoice_id: x.sales_invoice_id,
                sales_return_code_id: x.sales_invoice_code_id,
                sales_invoice:
                  x.sales_invoice == undefined
                    ? undefined
                    : SalesInvoiceItemModel.fromMap(x.sales_invoice),
              };
            }),
      user_sales_return_code_created_byTouser:
        data.user_sales_return_code_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(data.user_sales_return_code_created_byTouser),
      payment_method:
        data.payment_method == null
          ? null
          : data.payment_method == undefined
            ? undefined
            : PaymentMethodModel.fromMap(data.payment_method),
    });
  }
  /**
   * Fetch sales return by ID
   * @param mode
   * @returns
   */
}

export class SalesReturnModel {
  id?: number;
  quantity: number;
  sales_return_code_id: number;
  sales_invoice_id: number;

  sales_invoice?: SalesInvoiceItemModel;
  sales_return_code?: SalesReturnCodeModel;

  constructor(data: ISalesReturn) {
    this.id = data.id;
    this.quantity = data.quantity;
    this.sales_return_code_id = data.sales_return_code_id!;
    this.sales_invoice_id = data.sales_invoice_id;

    this.sales_return_code = data.sales_return_code;
    this.sales_invoice = data.sales_invoice;
  }
}
