import { createClient, RedisClientType } from "redis";

// Alamat diambil dari env dengan cadangan ke nilai lama, supaya server yang
// .env-nya belum diisi tetap berjalan persis seperti sebelumnya.
export const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redisClient: RedisClientType = createClient({ url: REDIS_URL });

export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.info("Successfully connected to Redis.");
    } catch (err) {
      console.error("Could not connect to Redis:", err);
      // process.exit(1); // Optionally exit if Redis is critical
    }
  }
}

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});

/**
 * Pilihan koneksi untuk BullMQ (ioredis), diturunkan dari REDIS_URL yang sama
 * dengan klien di atas.
 *
 * Antrean dan klien singgahan dulu menyambung lewat DUA jalan berbeda:
 * yang ini memakai REDIS_URL lengkap dengan sandinya, sementara queue.helper
 * dan worker merakit sendiri { host, port } dari REDIS_HOST/REDIS_PORT dan
 * TIDAK PERNAH membaca sandi. Pada server yang memasang `requirepass`,
 * seluruh antrean ditolak "NOAUTH Authentication required" sementara sisi
 * aplikasi lain berjalan normal — gejala yang menyesatkan justru karena
 * hanya sebagian yang buta.
 */
export function opsiKoneksiRedis() {
  try {
    const alamat = new URL(REDIS_URL);
    return {
      host: alamat.hostname || "127.0.0.1",
      port: Number(alamat.port) || 6379,
      ...(alamat.password
        ? { password: decodeURIComponent(alamat.password) }
        : {}),
      ...(alamat.username
        ? { username: decodeURIComponent(alamat.username) }
        : {}),
    };
  } catch {
    /* REDIS_URL tidak berbentuk URL — kembali ke pasangan host/port lama. */
    return {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      ...(process.env.REDIS_PASSWORD
        ? { password: process.env.REDIS_PASSWORD }
        : {}),
    };
  }
}
