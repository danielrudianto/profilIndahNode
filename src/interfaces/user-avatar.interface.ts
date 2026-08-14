import { UserViewModel } from "../models/user.model";

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
