"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserAvatarRepository = void 0;
class UserAvatarRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(data) {
        return this.prisma.user_avatar.create({
            data: {
                top: data.top,
                accessories: data.accessories,
                clothes: data.clothes,
                eyes: data.eyes,
                eyebrows: data.eyebrows,
                mouth: data.mouth,
                color: data.color,
                circle: data.circle,
                user_id: data.user_id,
            },
        });
    }
}
exports.UserAvatarRepository = UserAvatarRepository;
//# sourceMappingURL=user-avatar.repository.js.map