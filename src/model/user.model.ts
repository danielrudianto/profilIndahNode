import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcrypt";

const prisma = new PrismaClient();

class UserModel {
  id?: number;
  name: string;
  nik: string;
  username: string;
  password: string;
  created_by: number;
  created_at: Date;

  static roles = [
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

  constructor(
    name: string,
    nik: string,
    username: string,
    password: string,
    created_by: number
  ) {
    this.name = name;
    this.nik = nik;
    this.password = password;
    this.username = username;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.user.create({
      data: {
        name: this.name,
        username: this.username,
        password: this.password,
        nik: this.nik,
        created_by: this.created_by,
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

  static countDuplicate(username: string, nik: string) {
    return prisma.user.count({
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
    });
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

  static fetchById(id: number) {
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

  static update(
    id: number,
    name: string,
    password: string | null,
    created_by: number
  ) {
    if (password == null) {
      return prisma.user.update({
        where: {
          id: id,
        },
        data: {
          name: name,
          updated_by: created_by,
          updated_at: new Date(),
        },
      });
    } else {
      return prisma.user.update({
        where: {
          id: id,
        },
        data: {
          name: name,
          password: password,
          updated_by: created_by,
          updated_at: new Date(),
        },
      });
    }
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
