"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const payment_method_controller_1 = __importDefault(require("../../controller/payment-method.controller"));
const auth_helper_1 = require("../../helper/auth.helper");
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const router = (0, express_1.Router)();
router.get("/autocomplete", payment_method_controller_1.default.fetchAutocomplete);
router.get("/all", payment_method_controller_1.default.fetchAll);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, payment_method_controller_1.default.fetchByID);
router.get("/", payment_method_controller_1.default.fetch);
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, payment_method_controller_1.default.create);
router.put("/", (0, express_validator_1.body)("id").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, payment_method_controller_1.default.updateByID);
router.delete("/:id", auth_helper_1.administratorMiddleware, payment_method_controller_1.default.deleteByID);
exports.default = router;
//# sourceMappingURL=payment-method.route.js.map