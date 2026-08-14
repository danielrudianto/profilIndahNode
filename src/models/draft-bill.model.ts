export interface ICreateDraftBill {
  customer_id: number;
  created_by: number;
  note: string;
  name: string;
  service: number;
  delivery: number;
  items: ICreateDraftBillItems[];
  otc: string;
}

export interface ICreateDraftBillItems {
  item_id: number;
  quantity: number;
  price: number;
  discount: number;
  item_unit_id: number;
}

export interface IFetchDraftBill {
  id: number;
  name: string;
  created_at: string;
  created_by: string;
  customer_name: string;
  total: number;
  is_delete: number;
}

export interface IConfirmDraftBill {
  id: number;
  name: string;
  date: Date;
  customer_id: number | null;
  payment_methods: IConfirmDraftBillPaymentMethods[];
  service: number;
  delivery: number;
  discount: number;
  items: IConfirmDraftBillItems[];
  userID: number;
}

export interface IConfirmDraftBillPaymentMethods {
  payment_method_id: number;
  amount: number;
}

export interface IConfirmDraftBillItems {
  item_id: number;
  item_unit_id: number | null;
  quantity: number;
  discount: number;
  price: number;
}

export interface IFetchDraftBillOTC {
  otc: string;
  date: string;
}
