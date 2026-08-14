import { IUserAvatar } from ".//user-avatar.interface";
import { UserSalesModel } from "../models/user-sales.model";

export interface IUser {
  id?: number;
  name: string;
  nik: string;
  username: string;
  password?: string;
  created_by: number | null;
  created_at?: Date;
  is_active: boolean;
  updated_by?: number | null;
  updated_at?: Date | null;
  deleted_by?: number | null;
  deleted_at?: Date | null;
  role: number;
  roleText?: string;

  user_avatar?: IUserAvatar | null;
  user_sales?: UserSalesModel[];
}

export interface IUserViewModel {
  id?: number;
  name: string;
  username: string;
  role: number;
  user_avatar?: IUserAvatar | null;
}
