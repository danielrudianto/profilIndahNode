import { createClient } from "redis";

export const redisClient = createClient({ url: "redis://127.0.0.1:6379" });

export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      console.log("Successfully connected to Redis.");
    } catch (err) {
      console.error("Could not connect to Redis:", err);
      // process.exit(1); // Optionally exit if Redis is critical
    }
  }
}

redisClient.on("error", (err) => {
  console.error("Redis Client Error", err);
});
