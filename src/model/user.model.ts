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

interface IUserRole {
  id: number;
  name: string;
  available: boolean;
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

  static roles: IUserRole[] = [
    {
      id: 1,
      name: "Pembelian",
      available: true,
    },
    {
      id: 2,
      name: "Penjualan",
      available: true,
    },
    {
      id: 3,
      name: "Penjualan dan Pembelian",
      available: true,
    },
    // {
    //   id: 4,
    //   name: "Keuangan",
    //   available: false,
    // },
    {
      id: 5,
      name: "Administrator",
      available: true,
    },
    {
      id: 6,
      name: "Agen Penjualan",
      available: true,
    },
    {
      id: 7,
      name: "Superadministrator",
      available: true,
    },
  ];

  static fetchRole(roleID: number): IUserRole | null {
    return this.roles.filter((x) => x.id == roleID)[0] || null;
  }

  static async check(username: string, nik: string): Promise<boolean> {
    const matchingUserCount = await prisma.user.count({
      where: {
        OR: [{ username: username }, { nik: nik }],
      },
    });

    // Return true if no matching users are found, otherwise false
    return matchingUserCount === 0;
  }

  static fetch(keyword: string, offset: number, limit: number) {}

  static fetchByUsername(username: string) {
    return prisma.user.findUnique({
      select: {
        id: true,
        name: true,
        password: true,
        is_active: true,
        role: true,
        user_avatar: true,
      },
      where: {
        username: username,
      },
    });
  }

  update() {
    const userData: any = {
      name: this.name,
      updated_by: this.created_by,
      updated_at: new Date(),
      role: this.roleID,
      user_sales: {
        deleteMany: {},
        createMany: {
          data: this.user_sales!.map((x) => ({
            item_type_id: x.item_type_id,
          })),
        },
      },
    };

    // Add password field only if it exists
    if (this.password) {
      userData.password = this.password;
    }

    return prisma.user.update({
      where: {
        id: this.id!,
      },
      data: userData,
    });
  }

  delete() {
    return prisma.user.update({
      where: {
        id: this.id!,
      },
      data: {
        is_active: false,
        deleted_at: new Date(),
        deleted_by: this.created_by,
      },
      select: {
        id: true,
        name: true,
        username: true,
        nik: true,
        user_userTouser_deleted_by: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });
  }

  static updatePassword(password: string, userId: number) {
    return prisma.user.update({
      data: {
        password: password,
      },
      where: {
        id: userId,
      },
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
