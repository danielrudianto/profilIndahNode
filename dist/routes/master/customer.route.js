"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const customer_controller_1 = __importDefault(require("../../controller/customer.controller"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const customer_repository_1 = require("../../repositories/customer.repository");
const database_helper_1 = require("../../helper/database.helper");
const router = (0, express_1.Router)();
const customerController = new customer_controller_1.default(new customer_repository_1.CustomerRepository(database_helper_1.prisma));
// Reusable validators
const idParam = [
    (0, express_validator_1.param)("id").notEmpty().withMessage(error_list_1.default["Parameter error"]),
    (0, express_validator_1.param)("id").isInt({ min: 1 }).withMessage(error_list_1.default["Parameter error"]),
];
const customerBody = [
    (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Customer name is required"]),
    (0, express_validator_1.body)("pic").notEmpty().withMessage(error_list_1.default["Customer PIC is required"]),
    (0, express_validator_1.body)("phone_number")
        .exists()
        .withMessage(error_list_1.default["Customer phone number is required"]),
    (0, express_validator_1.body)("address")
        .notEmpty()
        .withMessage(error_list_1.default["Customer address is required"]),
    (0, express_validator_1.body)("npwp").exists().withMessage(error_list_1.default["Customer NPWP is required"]),
];
router.post("/", ...customerBody, error_helper_1.default.intercept, customerController.create);
router.put("/", (0, express_validator_1.body)("id").notEmpty().withMessage(error_list_1.default["Customer ID is required"]), (0, express_validator_1.body)("id")
    .isInt({ min: 1 })
    .withMessage(error_list_1.default["CUstomer ID must be integer"]), ...customerBody, error_helper_1.default.intercept, customerController.update);
router.delete("/:id", ...idParam, error_helper_1.default.intercept, customerController.delete);
router.get("/autocomplete", customerController.fetchAutocomplete);
router.get("/:id", ...idParam, error_helper_1.default.intercept, customerController.fetchByID);
router.get("/", customerController.fetch);
exports.default = router;
//# sourceMappingURL=customer.route.js.map