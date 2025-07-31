"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const user_avatar_controller_1 = __importDefault(require("../../controller/user-avatar.controller"));
const user_avatar_repository_1 = require("../../repositories/user-avatar.repository");
const database_helper_1 = require("../../helper/database.helper");
const router = (0, express_1.Router)();
const userAvatarController = new user_avatar_controller_1.default(new user_avatar_repository_1.UserAvatarRepository(database_helper_1.prisma));
const validateAvatarFields = [
    (0, express_validator_1.body)("accessories")
        .isInt({ min: 0 })
        .withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("top").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("clothes").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("color").isHexColor().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("eyes").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("eyebrows").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("mouth").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.body)("circle").isBoolean().withMessage(error_list_1.default["Parameter error"]),
];
router.post("/", [...validateAvatarFields, error_helper_1.default.intercept], userAvatarController.updateAvatar);
exports.default = router;
//# sourceMappingURL=user-avatar.route.js.map