import UserAvatarModel, { IUserAvatar } from "./user-avatar.model";
import { UserSalesModel } from "./user-sales.model";

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

interface IUserViewModel {
  id?: number;
  name: string;
  username: string;
  role: number;
  user_avatar?: IUserAvatar | null;
}

export class UserModel {
  id?: number;
  name: string;
  username: string;
  nik: string;
  created_by: number | null;
  role: number;
  roleText?: string;
  password?: string;
  user_avatar?: IUserAvatar | null;
  user_sales?: UserSalesModel[];
  updated_by?: number;
  updated_at?: Date;
  deleted_at?: Date | null;
  deleted_by?: number | null;
  is_active?: boolean;
  created_at?: Date;

  constructor(data: IUser) {
    this.id = data.id;
    this.name = data.name;
    this.username = data.username;
    this.nik = data.nik;
    this.created_by = data.created_by;
    this.role = data.role;
    this.roleText = data.roleText;
    this.password = data.password;
    this.user_avatar = data.user_avatar;
    this.user_sales = data.user_sales;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.user_sales = data.user_sales;
  }

  static fromMap(data: any): UserModel {
    // if user_avatar is not null, convert it to IUserAvatar
    if (data.user_avatar) {
      data.user_avatar = UserAvatarModel.fromMap(data.user_avatar);
    }

    return new UserModel({
      id: data.id,
      name: data.name,
      username: data.username,
      nik: data.nik,
      created_by: data.created_by,
      role: data.role,
      roleText: data.roleText,
      password: data.password,
      is_active: data.is_active, // default to true if not provided
      created_at: data.created_at,
      user_avatar:
        data.user_avatar == undefined
          ? undefined
          : UserAvatarModel.fromMap(data.user_avatar),
      user_sales: data.user_sales,
    });
  }
}

export class UserViewModel {
  id?: number;
  name: string;
  username: string;
  role: number;
  user_avatar?: IUserAvatar | null;

  constructor(data: IUserViewModel) {
    this.id = data.id;
    this.name = data.name;
    this.username = data.username;
    this.role = data.role;
    this.user_avatar = data.user_avatar || null;
  }

  static fromMap(data: any) {
    // if user_avatar is not null, convert it to IUserAvatar
    if (data.user_avatar) {
      data.user_avatar = UserAvatarModel.fromMap(data.user_avatar);
    }
    return new UserViewModel({
      id: data.id,
      name: data.name,
      username: data.username,
      role: data.role,
      user_avatar: data.user_avatar || null,
    });
  }
}
