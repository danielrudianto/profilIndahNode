export type MoneyReceiptDataable = {
  id: number;
  name: string;
  bill?: number;
  sales_return?: number;
  deposit?: number;
};

export type MoneyReceiptResponse = {
  id: number;
  name: string;
  bill_payment: number;
  sales_return_payment: number;
  deposit_payment: number;
};
