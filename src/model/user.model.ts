import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcrypt";

const prisma = new PrismaClient();

interface IUser {
  name: string;
  username: string;
  nik: string;
  created_by: number;
  role: number;
}

interface ICreateUser extends IUser {
  password: string;
}

interface IUpdateUser extends IUser {
  id: number;
  password: string | null;
}

interface IUserRole {
  id: number;
  name: string;
  available: boolean;
}

class UserModel {
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
  ];

  /**
   * Create a new user
   * @param data
   * @returns User
   */
  static create(data: ICreateUser) {
    return prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
        nik: data.nik,
        created_by: data.created_by,
        user_department: {
          create: {
            role: data.role,
          },
        },
      },
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
      },
    });
  }

  /**
   * Fetch role
   * @param roleID
   * @returns IUserRole | null
   */
  static fetchRole(roleID: number): IUserRole | null {
    return this.roles.filter((x) => x.id == roleID)[0] || null;
  }

  /**
   * Check if user with certain credential exists
   * @param username
   * @param nik
   * @returns boolean
   */
  static async checkByCredential(username: string, nik: string) {
    return (
      (await prisma.user.count({
        where: {
          OR: [
            {
              username: username,
            },
            {
              nik: nik,
            },
          ],
        },
      })) == 0
    );
  }

  static fetch(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.user.findMany({
          where: {
            is_active: true,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            username: true,
            user_department: {
              select: {
                role: true,
              },
            },
            nik: true,
          },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({
          where: {
            is_active: true,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.user.findMany({
          where: {
            is_active: true,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                username: {
                  contains: keyword,
                },
              },
              {
                nik: {
                  contains: keyword,
                },
              },
            ],
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            username: true,
            user_department: {
              select: {
                role: true,
              },
            },
            nik: true,
          },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({
          where: {
            is_active: true,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                username: {
                  contains: keyword,
                },
              },
              {
                nik: {
                  contains: keyword,
                },
              },
            ],
          },
        }),
      ]);
    }
  }

  /**
   * Fetch user by ID
   * @param id
   * @returns
   */
  static fetchByID(id: number) {
    return prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        username: true,
        nik: true,
        user_department: {
          select: {
            role: true,
          },
        },
        is_active: true,
      },
    });
  }

  static fetchByUsername(username: string) {
    return prisma.user.findUnique({
      select: {
        id: true,
        name: true,
        password: true,
        is_active: true,
        user_department: {
          select: {
            role: true,
          },
        },
      },
      where: {
        username: username,
      },
    });
  }

  static update(data: IUpdateUser) {
    return data.password == null
      ? prisma.user.update({
          where: {
            id: data.id,
          },
          data: {
            name: data.name,
            updated_by: data.created_by,
            updated_at: new Date(),
            user_department: {
              update: {
                role: data.role,
              },
            },
          },
        })
      : prisma.user.update({
          where: {
            id: data.id,
          },
          data: {
            name: data.name,
            updated_by: data.created_by,
            updated_at: new Date(),
            password: data.password,
            user_department: {
              update: {
                role: data.role,
              },
            },
          },
        });
  }

  static delete(user_id: number, status: boolean, created_by: number) {
    return prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        is_active: status,
        deleted_at: new Date(),
        deleted_by: created_by,
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

export default UserModel;
