import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ICreateAvatar {
  top: number;
  accessories: number;
  circle: boolean;
  clothes: number;
  color: string;
  eyebrows: number;
  eyes: number;
  mouth: number;
  user_id: number;
}

class UserAvatarModel {
  /**
   * Creates or updates a user avatar based on the provided data.
   * @param {ICreateAvatar} data - The data used to create or update the user avatar.
   * @return {Promise<UserAvatar>} A promise that resolves to the created or updated user avatar.
   */
  static create(data: ICreateAvatar) {
    return prisma.user_avatar.upsert({
      where: {
        user_id: data.user_id,
      },
      update: {
        top: data.top,
        accessories: data.accessories,
        circle: data.circle,
        clothes: data.clothes,
        color: data.color,
        eyebrows: data.eyebrows,
        eyes: data.eyes,
        mouth: data.mouth,
      },
      create: {
        top: data.top,
        accessories: data.accessories,
        circle: data.circle,
        clothes: data.clothes,
        color: data.color,
        eyebrows: data.eyebrows,
        eyes: data.eyes,
        mouth: data.mouth,
        user_id: data.user_id,
      },
    });
  }
}

export default UserAvatarModel;
