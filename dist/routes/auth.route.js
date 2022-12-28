"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_helper_1 = require("../helper/auth.helper");
const express_validator_1 = require("express-validator");
const auth_controller_1 = __importDefault(require("../controller/auth.controller"));
const router = (0, express_1.Router)();
router.post("/login", (0, express_validator_1.body)("username").not().isEmpty().withMessage("Mohon isikan username."), (0, express_validator_1.body)("password").not().isEmpty().withMessage("Mohon isikan password."), auth_controller_1.default.login);
router.post("/administratorLogin", (0, express_validator_1.body)("username").not().isEmpty().withMessage("Mohon isikan username."), (0, express_validator_1.body)("password").not().isEmpty().withMessage("Mohon isikan password."), auth_controller_1.default.administratorLogin);
router.get("/", auth_helper_1.authMiddleware, (req, res, next) => {
    res.status(200).send({
        status: "authorized",
    });
});
router.post("/token", auth_helper_1.authMiddleware, (0, express_validator_1.body)("token").not().isEmpty(), auth_controller_1.default.saveToken);
router.post("/refreshToken", auth_controller_1.default.refreshToken);
router.put("/password", auth_helper_1.authMiddleware, (0, express_validator_1.body)("password").not().isEmpty(), auth_controller_1.default.updatePassword);
router.put("/resetPassword", auth_helper_1.authMiddleware, auth_controller_1.default.resetPassword);
exports.default = router;
