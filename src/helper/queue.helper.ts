import { Queue } from "bullmq";

const redisConfiguration = {
  connection: {
    host: "localhost",
    port: 6379,
  },
};

export const queue = new Queue("queue", redisConfiguration);
