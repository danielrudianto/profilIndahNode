import { UserViewModel } from "../models/user.model";

export interface IProductType {
  id?: number;
  name: string;
  created_by?: number;
  created_at?: Date;
  updated_at?: Date;
  updated_by?: number;
  is_delete?: boolean;
  deleted_at?: Date;
  deleted_by?: number;
  can_delete?: boolean;

  user_item_type_created_byTouser?: UserViewModel;
}

export interface IProductTypeView {
  id?: number;
  name: string;
}
