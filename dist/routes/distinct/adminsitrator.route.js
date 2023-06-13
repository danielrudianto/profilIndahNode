"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../../controller/auth.controller"));
const customer_controller_1 = __importDefault(require("../../controller/customer.controller"));
const product_controller_1 = __importDefault(require("../../controller/product.controller"));
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.default.login);
router.post("/refresh-token", auth_controller_1.default.refreshToken);
router.post("/product", product_controller_1.default.fetchSmartSearchStock);
router.get("/product/:id", product_controller_1.default.fetchCompleteById);
router.get("/customer", customer_controller_1.default.fetch);
exports.default = router;
