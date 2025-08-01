"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = exports.redisClient = void 0;
const redis_1 = require("redis");
exports.redisClient = (0, redis_1.createClient)({ url: "redis://127.0.0.1:6379" });
async function connectRedis() {
    if (!exports.redisClient.isOpen) {
        try {
            await exports.redisClient.connect();
            console.info("Successfully connected to Redis.");
        }
        catch (err) {
            console.error("Could not connect to Redis:", err);
            // process.exit(1); // Optionally exit if Redis is critical
        }
    }
}
exports.connectRedis = connectRedis;
exports.redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
});
//# sourceMappingURL=redis.helper.js.map