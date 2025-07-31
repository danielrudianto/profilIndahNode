"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sales_controller_1 = require("../../controller/sales.controller");
const express_validator_1 = require("express-validator");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const error_helper_1 = __importDefault(require("../../helper/error.helper"));
const redis_helper_1 = require("../../helper/redis.helper");
const router = (0, express_1.Router)();
const salesmanController = new sales_controller_1.SalesmanController(redis_helper_1.redisClient);
router.post("/", (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Salesman name required"]), error_helper_1.default.intercept, salesmanController.createSalesman);
router.post("/delete", (0, express_validator_1.body)("name").notEmpty().withMessage(error_list_1.default["Salesman name required"]), error_helper_1.default.intercept, salesmanController.deleteSalesman);
router.get("/", salesmanController.fetch);
router.get("/all", salesmanController.fetchAll);
exports.default = router;
//# sourceMappingURL=salesman.route.js.map