"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_helper_1 = require("../../helper/auth.helper");
const express_validator_1 = require("express-validator");
const auth_controller_1 = __importDefault(require("../../controller/auth.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const user_repository_1 = require("../../repositories/user.repository");
const database_helper_1 = require("../../helper/database.helper");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const router = (0, express_1.Router)();
const authController = new auth_controller_1.default(new user_repository_1.UserRepository(database_helper_1.prisma));
router.post("/login", (0, express_validator_1.body)("username")
    .not()
    .isEmpty()
    .withMessage(error_list_1.default["Username is required"]), (0, express_validator_1.body)("password")
    .not()
    .isEmpty()
    .withMessage(error_list_1.default["Password is required"]), error_helper_1.default.intercept, authController.login);
router.post("/refresh-token", authController.refreshToken);
router.put("/password", auth_helper_1.authMiddleware, (0, express_validator_1.body)("password").not().isEmpty(), error_helper_1.default.intercept, authController.updatePassword);
router.put("/reset-password", auth_helper_1.authMiddleware, authController.updatePassword);
exports.default = router;
//# sourceMappingURL=auth.route.js.map