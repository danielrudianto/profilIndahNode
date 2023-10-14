"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queue = void 0;
const bullmq_1 = require("bullmq");
const redisConfiguration = {
    connection: {
        host: "localhost",
        port: 6379,
    },
};
exports.queue = new bullmq_1.Queue("queue", redisConfiguration);
