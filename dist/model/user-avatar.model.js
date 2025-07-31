"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const user_model_1 = require("./user.model");
const prisma = new client_1.PrismaClient();
class UserAvatarModel {
    constructor(data) {
        this.id = data.id;
        this.user_id = data.user_id;
        this.top = data.top;
        this.accessories = data.accessories;
        this.circle = data.circle;
        this.clothes = data.clothes;
        this.color = data.color;
        this.eyebrows = data.eyebrows;
        this.eyes = data.eyes;
        this.mouth = data.mouth;
        this.user = data.user;
    }
    static fromMap(data) {
        return new UserAvatarModel({
            top: data.top,
            accessories: data.accessories,
            circle: data.circle,
            clothes: data.clothes,
            color: data.color,
            eyebrows: data.eyebrows,
            eyes: data.eyes,
            mouth: data.mouth,
            user_id: data.user_id,
            id: data.id,
            user: data.user ? user_model_1.UserViewModel.fromMap(data.user) : undefined,
        });
    }
}
exports.default = UserAvatarModel;
//# sourceMappingURL=user-avatar.model.js.map