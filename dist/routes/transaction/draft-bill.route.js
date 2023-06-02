"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const draft_bill_controller_1 = __importDefault(require("../../controller/draft-bill.controller"));
const router = (0, express_1.Router)();
router.post("/order", draft_bill_controller_1.default.order);
router.post("/", draft_bill_controller_1.default.create);
exports.default = router;
