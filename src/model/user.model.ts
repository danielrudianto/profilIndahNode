import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface IUser {
  name: string;
  username: string;
  nik: string;
  created_by: number;
  role: number;
}

interface IUserSales {
  item_type_id: number;
}

interface ICreateUser extends IUser {
  password: string;
  user_sales?: IUserSales[];
}

interface IUpdateUser extends IUser {
  id: number;
  password: string | null;
}

interface IUpdateUserSales extends IUser {
  id: number;
  user_sales: IUserSales[];
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
    {
      id: 6,
      name: "Agen Penjualan",
      available: true,
    },
  ];

  /**
   * Create a new user
   * @param data
   * @returns User
   */
  static create(data: ICreateUser) {
    if (data.user_sales == undefined) {
      return prisma.user.create({
        data: {
          name: data.name,
          username: data.username,
          password: data.password,
          nik: data.nik,
          created_by: data.created_by,
          role: data.role,
          pinned_menus: "[]",
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
          user_sales: {
            select: {
              item_type: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    } else {
      return prisma.user.create({
        data: {
          name: data.name,
          username: data.username,
          password: data.password,
          nik: data.nik,
          created_by: data.created_by,
          role: data.role,
          pinned_menus: "[]",
          user_sales: {
            createMany: {
              data: data.user_sales!.map((x) => {
                return {
                  item_type_id: x.item_type_id,
                };
              }),
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
            role: true,
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
            role: true,
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
        role: true,
        user_avatar: true,
      },
      where: {
        username: username,
      },
    });
  }

  static update(data: IUpdateUserSales) {
    return data.password == null
      ? prisma.user.update({
          where: {
            id: data.id,
          },
          data: {
            name: data.name,
            updated_by: data.created_by,
            updated_at: new Date(),
            role: data.role,
            user_sales: {
              deleteMany: {},
              createMany: {
                data: data.user_sales.map((x) => {
                  return {
                    item_type_id: x.item_type_id,
                  };
                }),
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
            role: data.role,
            user_sales: {
              deleteMany: {},
              createMany: {
                data: data.user_sales.map((x) => {
                  return {
                    item_type_id: x.item_type_id,
                  };
                }),
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
