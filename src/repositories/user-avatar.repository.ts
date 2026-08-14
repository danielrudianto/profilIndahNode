import { PrismaClient } from "@prisma/client";
import { IUserAvatar } from "../interfaces/user-avatar.interface";

export class UserAvatarRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  create(data: IUserAvatar) {
    return this.prisma.user_avatar.create({
      data: {
        top: data.top,
        accessories: data.accessories,
        clothes: data.clothes,
        eyes: data.eyes,
        eyebrows: data.eyebrows,
        mouth: data.mouth,
        color: data.color,
        circle: data.circle,
        user_id: data.user_id!,
      },
    });
  }
}
