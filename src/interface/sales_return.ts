import { payment_method } from "@prisma/client";
import { bill } from "./bill";
import { customer } from "./customer";
import { user } from "./user";

export interface sales_return_code {
  id?: number;
  name: string;
  date: Date;
  created_by: number;
  created_at: Date;
  is_confirm?: boolean;
  is_delete?: boolean;
  confirmed_by?: number;
  confirmed_at?: Date;
  customer_id?: number | null;
  user_sales_return_code_created_byTouser?: user;
  customer?: customer;
  user_sales_return_code_deleted_byTouser?: user;
  sales_return?: sales_return[];
  payment_method_id?: number;
  payment_method?: payment_method;
}

export interface sales_return {
  id?: number;
  bill_id: number;
  quantity: number;
  sales_return_code_id?: number;

  sales_return_code?: sales_return_code;
  bill?: bill;
}
