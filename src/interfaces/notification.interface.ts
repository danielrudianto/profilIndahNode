import { UserViewModel } from "../models/user.model";

export interface INotification {
  id?: number;
  title: string;
  message: string;
  created_at?: Date;
  created_by?: number;

  user?: UserViewModel;
}

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
export interface RedisListClient {
  lpush(key: string, value: string): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
}
