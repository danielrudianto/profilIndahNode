import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class UserTokenModel {
  id?: number;
  user_id: number;
  token: string;

  constructor(user_id: number, token: string) {
    this.user_id = user_id;
    this.token = token;
  }

  create() {
    return prisma.user_token.create({
      data: {
        user_id: this.user_id,
        token: this.token,
      },
    });
  }

  upsert() {
    return prisma.$transaction([
      prisma.user_token.delete({
        where: {
          token: this.token,
        },
        select: {
          user: {
            select: {
              name: true,
              id: true,
            },
          },
          token: true,
          user_id: true,
        },
      }),
      prisma.user_token.create({
        data: {
          user_id: this.user_id,
          token: this.token,
        },
        select: {
          token: true,
        },
      }),
    ]);
  }

  check() {}

  static fetchByToken(token: string) {
    return prisma.user_token.findUnique({
      where: {
        token: token,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        token: true,
        user_id: true,
      },
    });
  }
}

export default UserTokenModel;
