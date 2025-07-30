"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class UserAvatarController {
    constructor(userAvatarRepository) {
        this.updateAvatar = async (req, res) => {
            try {
                const result = await this.userAvatarRepository.create({
                    user_id: req.body.userId,
                    top: req.body.top,
                    accessories: req.body.accessories,
                    eyes: req.body.eyes,
                    circle: req.body.circle,
                    clothes: req.body.clothes,
                    color: req.body.color,
                    eyebrows: req.body.eyebrows,
                    mouth: req.body.mouth,
                });
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating user's avatar ${error}`);
                return res.status(500).send(error);
            }
        };
        this.userAvatarRepository = userAvatarRepository;
    }
    validateCreate(req) {
        const requiredFields = [
            "top",
            "accessories",
            "eyes",
            "circle",
            "clothes",
            "color",
            "eyebrows",
            "mouth",
        ];
        const errors = [];
        // Check for missing fields
        requiredFields.forEach((field) => {
            if (!req.body[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        return errors;
    }
}
exports.default = UserAvatarController;
//# sourceMappingURL=user-avatar.controller.js.map