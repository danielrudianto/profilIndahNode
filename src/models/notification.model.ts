import { INotification } from "../interfaces/notification.interface";
import { UserViewModel } from "./user.model";

export class NotificationModel {
  id?: number;
  title: string;
  message: string;
  created_at?: Date;
  created_by?: number;
  user?: UserViewModel;

  constructor(data: INotification) {
    this.id = data.id;
    this.title = data.title;
    this.message = data.message;
    this.created_at = data.created_at;
    this.created_by = data.created_by;
    this.user = data.user;
  }

  static fromMap(data: any): NotificationModel {
    return new NotificationModel({
      id: data.id,
      title: data.title,
      message: data.message,
      created_at: data.created_at,
      created_by: data.created_by,
      user: UserViewModel.fromMap(data.user),
    });
  }
}
