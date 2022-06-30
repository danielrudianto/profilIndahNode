"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const express_1 = require("express");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
router.post("/", (req, res, next) => { });
router.get("/", (req, res, next) => { });
exports.default = router;
