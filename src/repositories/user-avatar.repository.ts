import { PrismaClient } from "@prisma/client";
import { IUserAvatar } from "../model/user-avatar.model";

export class UserAvatarRepository {
  private prisma: PrismaClient;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  create(data: IUserAvatar) {
    return this.prisma.user_avatar.create({
      data: {
        ...data,
        user_id: data.user_id!,
      },
    });
  }
}
