"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notification_model_1 = require("../model/notification.model");
class NotificationRepository {
    constructor(redis, prisma) {
        this.create = async (data) => {
            try {
                await this.redis.lpush("notification", JSON.stringify(data));
                await this.redis.ltrim("notification", 0, 9);
                await this.prisma.notification.create({
                    data: {
                        title: data.title,
                        message: data.message,
                        created_by: data.created_by,
                        created_at: data.created_at,
                    },
                });
            }
            catch (error) {
                console.error(`[error]: Error while creating notification: ${error}`);
                throw new Error("Internal server error");
            }
        };
        this.fetch = async () => {
            try {
                const notifications = await this.redis.lrange("notification", 0, -1);
                return notifications.map((n) => notification_model_1.NotificationModel.fromMap(JSON.parse(n)));
            }
            catch (error) {
                console.error(`[error]: Error while fetching notifications: ${error}`);
                throw new Error("Internal server error");
            }
        };
        this.redis = redis;
        this.prisma = prisma;
    }
}
//# sourceMappingURL=notification.repository.js.map