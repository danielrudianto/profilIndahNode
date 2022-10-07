"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../controller/auth.controller"));
const user_controller_1 = __importDefault(require("../controller/user.controller"));
const router = (0, express_1.Router)();
router.get("/roles", auth_controller_1.default.fetchRoles);
router.get("/profile", auth_controller_1.default.fetchProfile);
router.get("/fetchById/:id", user_controller_1.default.fetchById);
router.get("/", user_controller_1.default.fetch);
router.post("/changePassword", user_controller_1.default.changePassword);
router.post("/", user_controller_1.default.create);
router.put("/", user_controller_1.default.update);
router.delete("/:id", user_controller_1.default.toggleActive);
exports.default = router;
