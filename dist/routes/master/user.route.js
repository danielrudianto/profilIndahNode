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
const user_repository_1 = require("../../repositories/user.repository");
const database_helper_1 = require("../../helper/database.helper");
const sales_invoice_repository_1 = require("../../repositories/sales-invoice.repository");
const customer_repository_1 = require("../../repositories/customer.repository");
const router = (0, express_1.Router)();
const userController = new user_controller_1.default(new user_repository_1.UserRepository(database_helper_1.prisma), new sales_invoice_repository_1.SalesInvoiceRepository(database_helper_1.prisma), new customer_repository_1.CustomerRepository(database_helper_1.prisma));
const authController = new auth_controller_1.default(new user_repository_1.UserRepository(database_helper_1.prisma));
// Common validation middleware
const validateId = [
    (0, express_validator_1.param)("id").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]),
];
const validateUserFields = [
    (0, express_validator_1.body)("role")
        .notEmpty()
        .isNumeric()
        .withMessage(error_list_1.default["User role required"]),
    (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Name required"]),
    (0, express_validator_1.body)("username").notEmpty().withMessage(error_list_1.default["Username is required"]),
    (0, express_validator_1.body)("nik").notEmpty().withMessage(error_list_1.default["Parameter error"]),
];
// Routes
router.get("/profile", authController.fetchProfile);
router.get("/:id", [...validateId, error_helper_1.default.intercept], userController.fetchByID);
router.get("/", userController.fetch);
router.post("/changePassword", (0, express_validator_1.body)("password").notEmpty().withMessage(error_list_1.default["Password is required"]), error_helper_1.default.intercept, userController.updatePassword);
router.post("/", auth_helper_1.administratorMiddleware, [...validateUserFields, error_helper_1.default.intercept], userController.create);
router.put("/", auth_helper_1.administratorMiddleware, [
    (0, express_validator_1.body)("id").notEmpty().isNumeric().withMessage(error_list_1.default["ID is required"]),
    ...validateUserFields,
    error_helper_1.default.intercept,
], userController.update);
router.delete("/:id", [...validateId, error_helper_1.default.intercept], userController.toggleActive);
exports.default = router;
//# sourceMappingURL=user.route.js.map