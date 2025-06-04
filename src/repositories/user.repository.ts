import { PrismaClient } from "@prisma/client";
import { IUser, UserModel } from "../model/user.model";
import { UserRoleModel } from "../model/user_role.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";

export class UserRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  create(data: IUser) {
    const userData: any = {
      name: data.name,
      username: data.username,
      password: data.password!,
      nik: data.nik,
      created_by: data.created_by,
      role: data.roleID,
      pinned_menus: "[]",
    };

    if (data.user_sales !== undefined) {
      userData.user_sales = {
        createMany: {
          data: data.user_sales.map((x) => ({ item_type_id: x.item_type_id })),
        },
      };
    }

    return this.prisma.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        username: true,
        nik: true,
        user: {
          select: {
            name: true,
          },
        },
        user_sales:
          data.user_sales !== undefined
            ? {
                select: {
                  item_type: {
                    select: {
                      name: true,
                    },
                  },
                },
              }
            : undefined,
      },
    });
  }

  validateCreate(data: IUser): string[] {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === "") {
      errors.push("Name is required.");
    }

    if (!data.username || data.username.trim() === "") {
      errors.push("Username is required.");
    }

    if (!data.password || data.password.trim() === "") {
      errors.push("Password is required.");
    }

    if (!data.nik || data.nik.trim() === "") {
      errors.push("NIK is required.");
    }

    if (!data.roleID || isNaN(data.roleID)) {
      errors.push("Valid role ID is required.");
    }

    if (data.user_sales && !Array.isArray(data.user_sales)) {
      errors.push("User sales must be an array.");
    }

    return errors;
  }

  async fetchByID(id: number): Promise<UserModel | null> {
    const result = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        nik: true,
        role: true,
        user_sales: {
          select: {
            item_type: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        is_active: true,
        created_at: true,
        created_by: true,
      },
    });

    if (!result) {
      return null;
    }

    return new UserModel({
      id: result.id,
      name: result.name,
      username: result.username,
      nik: result.nik,
      roleID: result.role,
      role: UserRoleModel.fromRoleID(result.role)!,
      user_sales: result.user_sales.map((x) => ({
        item_type_id: x.item_type.id,
        item_type_name: x.item_type.name,
      })),
      is_active: result.is_active,
      created_at: result.created_at,
      created_by: result.created_by,
    });
  }

  async fetch(data: IFetchCommon): Promise<IFetchCommonResult<UserModel>> {
    const { page, keyword, pageSize } = data;

    const baseWhere = { is_active: true };
    const searchConditions = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { username: { contains: keyword } },
            { nik: { contains: keyword } },
          ],
        }
      : {};

    const whereClause = keyword
      ? { ...baseWhere, ...searchConditions }
      : baseWhere;

    const [result, count] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          nik: true,
        },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      data: result.map((x) => {
        return new UserModel({
          id: x.id,
          name: x.name,
          username: x.username,
          roleID: x.role,
          nik: x.nik,
          role: UserRoleModel.fromRoleID(x.role)!,
          user_sales: [],
          is_active: true, // Default value, adjust as necessary
          created_at: new Date(), // Default value, adjust as necessary
          created_by: 0, // Default value, adjust as necessary
        });
      }),
      count: count,
    };
  }

  toggleActive(id: number, is_active: boolean) {
    return this.prisma.user.update({
      where: {
        id: id,
      },
      data: {
        is_active: is_active,
        updated_at: new Date(),
      },
    });
  }

  updatePassword(id: number, password: string) {
    return this.prisma.user.update({
      where: {
        id: id,
      },
      data: {
        password: password,
        updated_at: new Date(),
      },
      select: {
        id: true,
        name: true,
        username: true,
        nik: true,
      },
    });
  }
}
