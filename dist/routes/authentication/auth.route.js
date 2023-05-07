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
const router = (0, express_1.Router)();
router.post("/login", (0, express_validator_1.body)("username").not().isEmpty().withMessage("Mohon isikan username."), (0, express_validator_1.body)("password").not().isEmpty().withMessage("Mohon isikan password."), error_helper_1.default.intercept, auth_controller_1.default.login);
router.post("/refresh-token", auth_controller_1.default.refreshToken);
router.put("/password", auth_helper_1.authMiddleware, (0, express_validator_1.body)("password").not().isEmpty(), error_helper_1.default.intercept, auth_controller_1.default.updatePassword);
router.put("/reset-password", auth_helper_1.authMiddleware, auth_controller_1.default.resetPassword);
exports.default = router;
