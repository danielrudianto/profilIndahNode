"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bill_controller_1 = __importDefault(require("../controller/bill.controller"));
const auth_helper_1 = require("../helper/auth.helper");
const router = (0, express_1.Router)();
router.post("/", bill_controller_1.default.create);
router.get("/archives", bill_controller_1.default.fetchArchive);
router.get("/archives/:year", bill_controller_1.default.fetchArchive);
router.get("/archives/:year/:month", bill_controller_1.default.fetchArchive);
router.get("/code/:id", bill_controller_1.default.fetchCodeById);
router.get("/:id", bill_controller_1.default.fetchById);
router.delete("/:id", auth_helper_1.administratorMiddleware, bill_controller_1.default.deleteById);
exports.default = router;
