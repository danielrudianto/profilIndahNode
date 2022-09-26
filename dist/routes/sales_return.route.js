"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sales_return_controller_1 = __importDefault(require("../controller/sales_return.controller"));
const router = (0, express_1.Router)();
router.post("/search", sales_return_controller_1.default.fetchSearch);
router.post("/", sales_return_controller_1.default.create);
router.get("/archives", sales_return_controller_1.default.fetchArchive);
router.get("/archives/:year", sales_return_controller_1.default.fetchArchive);
router.get("/archives/:year/:month", sales_return_controller_1.default.fetchArchive);
exports.default = router;
