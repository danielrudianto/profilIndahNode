import { Queue } from "bullmq";

const redisConfiguration = {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
};

export const queue = new Queue("queue", redisConfiguration);
