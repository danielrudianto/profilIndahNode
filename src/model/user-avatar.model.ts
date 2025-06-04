import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export interface IUserAvatar {
  id?: number;
  user_id?: number;
  top: number;
  accessories: number;
  circle: boolean;
  clothes: number;
  color: string;
  eyebrows: number;
  eyes: number;
  mouth: number;
}

class UserAvatarModel {
  id?: number;
  user_id?: number;
  top: number;
  accessories: number;
  circle: boolean;
  clothes: number;
  color: string;
  eyebrows: number;
  eyes: number;
  mouth: number;

  constructor(data: IUserAvatar) {
    this.user_id = data.user_id;
    this.top = data.top;
    this.accessories = data.accessories;
    this.circle = data.circle;
    this.clothes = data.clothes;
    this.color = data.color;
    this.eyebrows = data.eyebrows;
    this.eyes = data.eyes;
    this.mouth = data.mouth;
  }

  create() {
    this.validateCreate();

    return prisma.user_avatar.upsert({
      where: {
        user_id: this.user_id,
      },
      update: {
        top: this.top,
        accessories: this.accessories,
        circle: this.circle,
        clothes: this.clothes,
        color: this.color,
        eyebrows: this.eyebrows,
        eyes: this.eyes,
        mouth: this.mouth,
      },
      create: {
        top: this.top,
        accessories: this.accessories,
        circle: this.circle,
        clothes: this.clothes,
        color: this.color,
        eyebrows: this.eyebrows,
        eyes: this.eyes,
        mouth: this.mouth,
        user_id: this.user_id!,
      },
    });
  }

  private validateCreate() {
    if (this.user_id === undefined || this.user_id <= 0) {
      throw new Error("User ID must be provided and greater than zero.");
    }
    if (
      this.top < 0 ||
      this.accessories < 0 ||
      this.clothes < 0 ||
      this.eyebrows < 0 ||
      this.eyes < 0 ||
      this.mouth < 0
    ) {
      throw new Error("Avatar attributes must be non-negative integers.");
    }
    if (typeof this.circle !== "boolean") {
      throw new Error("Circle must be a boolean value.");
    }
    if (!this.color) {
      throw new Error("Color must be provided.");
    }
  }

  static fromMap(data: any): UserAvatarModel {
    return new UserAvatarModel({
      top: data.top,
      accessories: data.accessories,
      circle: data.circle,
      clothes: data.clothes,
      color: data.color,
      eyebrows: data.eyebrows,
      eyes: data.eyes,
      mouth: data.mouth,
    });
  }
}

export default UserAvatarModel;
