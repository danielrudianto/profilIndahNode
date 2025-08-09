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
const database_helper_1 = require("../../helper/database.helper");
const payment_method_repository_1 = require("../../repositories/payment-method.repository");
const router = (0, express_1.Router)();
const paymentMethodController = new payment_method_controller_1.default(new payment_method_repository_1.PaymentMethodRepository(database_helper_1.prisma));
router.get("/autocomplete", paymentMethodController.fetchAutocomplete);
router.get("/all", paymentMethodController.fetchAll);
router.get("/:id", (0, express_validator_1.param)("id").isNumeric().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, paymentMethodController.fetchByID);
router.get("/", paymentMethodController.fetch);
router.post("/", (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, paymentMethodController.create);
router.put("/", (0, express_validator_1.body)("id").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("name").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), (0, express_validator_1.body)("description").not().isEmpty().withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, paymentMethodController.update);
router.delete("/:id", (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["ID is required"]), (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["ID must be numeric"]), error_helper_1.default.intercept, auth_helper_1.administratorMiddleware, paymentMethodController.delete);
exports.default = router;
//# sourceMappingURL=payment-method.route.js.map