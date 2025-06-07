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
