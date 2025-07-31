"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const error_list_1 = __importDefault(require("../../assets/error_list"));
const router = (0, express_1.Router)();
// router.get("/product-type", ProductTypeController.fetchAll);
router.post("/", (0, express_validator_1.body)("last_fetched").notEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("last_fetched").isInt().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept);
exports.default = router;
//# sourceMappingURL=warehouse.route.js.map