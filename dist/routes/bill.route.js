"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const bill_controller_1 = __importDefault(require("../controller/bill.controller"));
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
router.post("/", bill_controller_1.default.create);
router.get("/", (req, res, next) => { });
exports.default = router;
