"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class UserAvatarModel {
    constructor(user_id, top, accessories, circle, clothes, color, eyebrows, eyes, mouth) {
        this.user_id = user_id;
        this.top = top;
        this.accessories = accessories;
        this.circle = circle;
        this.clothes = clothes;
        this.color = color;
        this.eyebrows = eyebrows;
        this.eyes = eyes;
        this.mouth = mouth;
    }
    /**
     * Creates or updates a user avatar based on the provided data.
     * @param {ICreateAvatar} data - The data used to create or update the user avatar.
     * @return {Promise<UserAvatar>} A promise that resolves to the created or updated user avatar.
     */
    create() {
        return prisma.user_avatar.upsert({
            where: {
                user_id: this.user_id,
            },
            update: {
                top: this.top,
                accessories: this.accessories,
                circle: this.circle,
                clothes: this.clothes,
                color: this.color,
                eyebrows: this.eyebrows,
                eyes: this.eyes,
                mouth: this.mouth,
            },
            create: {
                top: this.top,
                accessories: this.accessories,
                circle: this.circle,
                clothes: this.clothes,
                color: this.color,
                eyebrows: this.eyebrows,
                eyes: this.eyes,
                mouth: this.mouth,
                user_id: this.user_id,
            },
        });
    }
}
exports.default = UserAvatarModel;
//# sourceMappingURL=user-avatar.model.js.map