import { user } from "./user";

export interface customer {
  id?: number;
  name: string;
  address: string;
  pic: string;
  phone_number: string;
  is_delete?: boolean;
  npwp?: string;
  created_by?: number;
  created_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;

  user_customer_created_byTouser?: user;
  user_customer_deleted_byTouser?: user;
}
