import { UserViewModel } from "../models/user.model";

export interface IProductBrand {
  id?: number;
  name: string;
  created_by: number;
  created_at?: Date;
  is_delete?: boolean;
  deleted_by?: number;
  deleted_at?: Date;
  can_delete?: boolean | string;
  product_count?: number;

  user?: UserViewModel;
}

export interface IProductBrandView {
  id?: number;
  name: string;
}
