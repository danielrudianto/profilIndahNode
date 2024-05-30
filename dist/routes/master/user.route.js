"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const auth_controller_1 = __importDefault(require("../../controller/auth.controller"));
const user_controller_1 = __importDefault(require("../../controller/user.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/profile", auth_controller_1.default.fetchProfile);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, user_controller_1.default.fetchByID);
router.get("/", user_controller_1.default.fetch);
router.post("/changePassword", (0, express_validator_1.body)("password").notEmpty().withMessage(error_list_1.default["Password required"]), error_helper_1.default.intercept, user_controller_1.default.updatePassword);
router.post("/avatar", (0, express_validator_1.body)("accessories")
    .isInt({ min: 0 })
    .withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("top").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("clothes").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("color").isHexColor().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("eyes").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("eyebrows").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("mouth").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("circle").isBoolean().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, user_controller_1.default.updateAvatar);
router.post("/", auth_helper_1.administratorMiddleware, (0, express_validator_1.body)("role")
    .notEmpty()
    .isNumeric()
    .withMessage(error_list_1.default["User role required"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Name required"]), (0, express_validator_1.body)("username").notEmpty().withMessage(error_list_1.default["Username is required"]), (0, express_validator_1.body)("nik").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, user_controller_1.default.create);
router.put("/", auth_helper_1.administratorMiddleware, (0, express_validator_1.body)("id").notEmpty().isNumeric().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.body)("role")
    .notEmpty()
    .isNumeric()
    .withMessage(error_list_1.default["User role required"]), (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Name required"]), (0, express_validator_1.body)("username").notEmpty().withMessage(error_list_1.default["Username is required"]), (0, express_validator_1.body)("nik").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, user_controller_1.default.update);
router.delete("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, user_controller_1.default.toggleActive);
exports.default = router;
//# sourceMappingURL=user.route.js.map