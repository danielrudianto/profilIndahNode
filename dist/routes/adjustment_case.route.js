"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adjustment_case_controller_1 = __importDefault(require("../controller/adjustment_case.controller"));
const router = (0, express_1.Router)();
router.get("/archives/:year/:month", adjustment_case_controller_1.default.fetchArchives);
router.get("/archives/:year", adjustment_case_controller_1.default.fetchArchives);
router.get("/archives", adjustment_case_controller_1.default.fetchArchives);
router.get("/:id", adjustment_case_controller_1.default.fetchById);
router.post("/", adjustment_case_controller_1.default.post);
exports.default = router;
