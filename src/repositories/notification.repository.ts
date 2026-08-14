import { RedisListClient } from "../interfaces/notification.interface";
import { PrismaClient } from "@prisma/client";
import { NotificationModel } from "../models/notification.model";

class NotificationRepository {
  private redis: RedisListClient;
  private prisma: PrismaClient;

  constructor(redis: RedisListClient, prisma: PrismaClient) {
    this.redis = redis;
    this.prisma = prisma;
  }

  create = async (data: NotificationModel) => {
    try {
      await this.redis.lpush("notification", JSON.stringify(data));
      await this.redis.ltrim("notification", 0, 9);
      await this.prisma.notification.create({
        data: {
          title: data.title,
          message: data.message,
          created_by: data.created_by!,
          created_at: data.created_at,
        },
      });
    } catch (error) {
      console.error(`[error]: Error while creating notification: ${error}`);
      throw new Error("Internal server error");
    }
  };

  fetch = async (): Promise<NotificationModel[]> => {
    try {
      const notifications = await this.redis.lrange("notification", 0, -1);
      return notifications.map((n) => NotificationModel.fromMap(JSON.parse(n)));
    } catch (error) {
      console.error(`[error]: Error while fetching notifications: ${error}`);
      throw new Error("Internal server error");
    }
  };
}
