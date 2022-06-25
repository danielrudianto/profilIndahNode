import { company } from "./company";
import { good_receipt } from "./good_receipt";
import { item } from "./item";
import { supplier } from "./supplier";
import { user } from "./user";

export interface purchase_order {
  id?: number;
  item_id?: number;
  price_list: number;
  price: number;
  quantity: number;
  purchase_order_code_id?: number;
  item?: item;
  purchase_order_code?: purchase_order_code;
  good_receipt?: good_receipt[];
}

export interface purchase_order_code {
  id?: number;
  name: string;
  created_by?: number;
  created_at?: Date;
  confirmed_by?: number;
  confirmed_at?: Date;
  is_confirm?: boolean;
  is_delete?: boolean;
  company_id?: number;
  supplier_id?: number;
  company?: company;
  user_purchase_order_code_confirmed_byTouser?: user;
  user_purchase_order_code_created_byTouser?: user;
  supplier?: supplier;

  purchase_order?: purchase_order[];
}
