"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const receivable_controller_1 = __importDefault(require("../../controller/receivable.controller"));
const router = (0, express_1.Router)();
router.get("/history/:id", receivable_controller_1.default.fetchPaymentsHistory);
router.get("/customer/:id", receivable_controller_1.default.fetchByCustomerID);
router.get("/", receivable_controller_1.default.fetch);
router.post("/payment", receivable_controller_1.default.createPayment);
router.delete("/:id", receivable_controller_1.default.deletePayment);
exports.default = router;
//# sourceMappingURL=receivable.route.js.map