import { UserViewModel } from "./user.model";

export interface IUserAvatar {
  id?: number;
  user_id?: number;
  top: number;
  accessories: number;
  clothes: number;
  eyes: number;
  eyebrows: number;
  mouth: number;
  color: string;
  circle: boolean;

  user?: UserViewModel;
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

  user?: UserViewModel;

  constructor(data: IUserAvatar) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.top = data.top;
    this.accessories = data.accessories;
    this.circle = data.circle;
    this.clothes = data.clothes;
    this.color = data.color;
    this.eyebrows = data.eyebrows;
    this.eyes = data.eyes;
    this.mouth = data.mouth;
    this.user = data.user;
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
      user_id: data.user_id,
      id: data.id,
      user: data.user ? UserViewModel.fromMap(data.user) : undefined,
    });
  }
}

export default UserAvatarModel;
