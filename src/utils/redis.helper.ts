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
