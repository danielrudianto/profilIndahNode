"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const receivable_controller_1 = __importDefault(require("../../controller/receivable.controller"));
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const receivable_repository_1 = require("../../repositories/receivable.repository");
const redis_helper_1 = require("../../helper/redis.helper");
const database_helper_1 = require("../../helper/database.helper");
const router = (0, express_1.Router)();
const receivableController = new receivable_controller_1.default(new receivable_repository_1.ReceivableRepository(redis_helper_1.redisClient, database_helper_1.prisma));
router.get("/", receivableController.fetch);
router.get("/history/:id", receivable_controller_1.default.fetchPaymentsHistory);
router.get("/customer/v2/:id", (0, express_validator_1.param)("id").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, receivable_controller_1.default.fetchByCustomerIDV2);
router.get("/customer/:id", (0, express_validator_1.param)("id").isInt({ min: 0 }).withMessage(error_list_1.default["Parameter error"]), error_helper_1.default.intercept, receivable_controller_1.default.fetchByCustomerID);
router.get("/", receivable_controller_1.default.fetch);
router.post("/payment", receivable_controller_1.default.createPayment);
router.delete("/:id", receivable_controller_1.default.deletePayment);
exports.default = router;
//# sourceMappingURL=receivable.route.js.map