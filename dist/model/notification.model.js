"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModel = void 0;
const user_model_1 = require("./user.model");
class NotificationModel {
    constructor(data) {
        this.id = data.id;
        this.title = data.title;
        this.message = data.message;
        this.created_at = data.created_at;
        this.created_by = data.created_by;
        this.user = data.user;
    }
    static fromMap(data) {
        return new NotificationModel({
            id: data.id,
            title: data.title,
            message: data.message,
            created_at: data.created_at,
            created_by: data.created_by,
            user: user_model_1.UserViewModel.fromMap(data.user),
        });
    }
}
exports.NotificationModel = NotificationModel;
//# sourceMappingURL=notification.model.js.map