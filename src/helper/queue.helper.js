"use strict";
exports.__esModule = true;
exports.queue = void 0;
var bullmq_1 = require("bullmq");
var redisConfiguration = {
    connection: {
        host: "localhost",
        port: 6379
    }
};
exports.queue = new bullmq_1.Queue("queue", redisConfiguration);
