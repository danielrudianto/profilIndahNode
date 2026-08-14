import { UserViewModel } from "../models/user.model";

export interface ICustomer {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  pic: string;
  phone_number: string;
  created_by?: number;
  created_at?: Date;
  updated_by?: number | null;
  updated_at?: Date | null;
  deleted_by?: number | null;
  deleted_at?: Date | null;

  user?: UserViewModel;

  is_delete: boolean;
  can_delete?: boolean | string;
}
