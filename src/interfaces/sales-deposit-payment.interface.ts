import { PaymentMethodViewModel } from "../models/payment-method.model";

export interface ISalesDepositPayment {
  id?: number;
  sales_deposit_code_id: number;
  payment_method_id: number | null;
  value: number;
  date: Date;

  payment_method?: PaymentMethodViewModel | null; // Optional field to include payment method details

  // to update the bill code status
  is_paid?: boolean;
}
