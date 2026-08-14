import { ISalesDepositPayment } from "../interfaces/sales-deposit-payment.interface";
import { PaymentMethodViewModel } from "./payment-method.model";

export class SalesDepositPaymentModel {
  id?: number;
  sales_deposit_code_id: number;
  payment_method_id: number | null;
  value: number;
  date: Date;
  is_paid?: boolean;

  payment_method?: PaymentMethodViewModel | null; // Optional field to include payment method details

  constructor(data: ISalesDepositPayment) {
    this.id = data.id;
    this.sales_deposit_code_id = data.sales_deposit_code_id;
    this.payment_method_id = data.payment_method_id;
    this.value = data.value;
    this.date = data.date;
    this.is_paid = data.is_paid;
    this.payment_method = PaymentMethodViewModel.fromMap(data.payment_method);
  }

  static fromMap(data: any) {
    return new SalesDepositPaymentModel({
      id: data.id,
      sales_deposit_code_id: data.sales_deposit_code_id,
      payment_method_id: data.payment_method_id,
      value: Number(data.value),
      date: new Date(data.date),
      payment_method:
        data.payment_method == undefined
          ? undefined
          : data.payment_method == null
          ? null
          : PaymentMethodViewModel.fromMap(data.payment_method),
    });
  }
}
