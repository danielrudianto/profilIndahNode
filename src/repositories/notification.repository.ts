import { PrismaClient } from "@prisma/client";
import { NotificationModel } from "../models/notification.model";

/**
 * Bentuk klien minimal yang dipakai berkas ini.
 *
 * Sebelumnya memakai tipe RedisClient dari bullmq, yang berbentuk ioredis.
 * Sejak bullmq v6 tipe itu tidak lagi memuat perintah daftar, sehingga berkas
 * ini menghentikan `npm run build` walaupun tidak pernah dipakai.
 *
 * Catatan: nama perintah di sini bergaya ioredis (huruf kecil semua),
 * sedangkan klien redis yang dipakai proyek ini memakai lPush/lTrim/lRange.
 * Jadi berkas ini akan gagal saat dijalankan kalau diberi redisClient dari
 * helper/redis.helper. Modul notifikasi memang belum tersambung ke mana pun.
 */
interface RedisListClient {
  lpush(key: string, value: string): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}

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
