import { PrismaClient } from "@prisma/client";
import UserAvatarModel, { IUserAvatar } from "./user-avatar.model";

const prisma = new PrismaClient();

export interface IUser {
  id?: number;
  name: string;
  username: string;
  nik: string;
  created_by: number | null;
  created_at?: Date;
  roleID: number;
  role?: string;
  password?: string;
  user_avatar?: IUserAvatar | null;
  user_sales?: IUserSales[];
  is_active: boolean;
}

interface IUserViewModel {
  id?: number;
  name: string;
  username: string;
  role: number;
  user_avatar?: IUserAvatar | null;
}

interface IUserSales {
  item_type_id: number;
}

export class UserModel {
  id?: number;
  name: string;
  username: string;
  nik: string;
  created_by: number | null;
  roleID: number;
  role?: string;
  password?: string;
  user_avatar?: IUserAvatar | null;
  user_sales?: IUserSales[];
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
    this.roleID = data.roleID;
    this.role = data.role;
    this.password = data.password;
    this.user_avatar = data.user_avatar || null;
    this.user_sales = data.user_sales || [];
    this.is_active = data.is_active;
    this.created_at = data.created_at == null ? new Date() : data.created_at;
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
