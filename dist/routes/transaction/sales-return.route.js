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
router.post("/search", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_return_controller_1.default.fetchSearch);
router.post("/archives", sales_return_controller_1.default.fetchArchives);
router.post("/", (0, express_validator_1.body)("date").notEmpty().withMessage(error_list_1.default["Date required"]), (0, express_validator_1.body)("payment_method_id")
    .notEmpty()
    .withMessage(error_list_1.default["Payment method required"]), error_helper_1.default.intercept, sales_return_controller_1.default.create);
router.get("/code/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_return_controller_1.default.fetchCodeByID);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_return_controller_1.default.fetchByID);
router.delete("/:id", auth_helper_1.administratorMiddleware, (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id")
    .isInt({
    min: 0,
})
    .withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, sales_return_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=sales-return.route.js.map