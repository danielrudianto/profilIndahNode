"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const sales_return_controller_1 = __importDefault(require("../../controller/sales-return.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.post("/search", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("items").exists().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_return_controller_1.default.fetchSearch);
router.post("/", sales_return_controller_1.default.create);
router.get("/code/:id", sales_return_controller_1.default.fetchCodeById);
router.get("/archives", sales_return_controller_1.default.fetchArchives);
router.get("/:id", sales_return_controller_1.default.fetchById);
router.delete("/:id", auth_helper_1.administratorMiddleware, sales_return_controller_1.default.deleteById);
exports.default = router;
