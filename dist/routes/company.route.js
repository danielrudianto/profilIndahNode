"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = __importDefault(require("../controller/company.controller"));
const router = (0, express_1.Router)();
router.post("/", company_controller_1.default.create);
router.get("/autocomplete", company_controller_1.default.getAutocomplete);
router.get("/available", company_controller_1.default.fetchAvailable);
router.get("/:id", company_controller_1.default.fetchById);
router.get("/", company_controller_1.default.fetch);
router.delete("/:companyId", company_controller_1.default.delete);
router.put("/", company_controller_1.default.update);
exports.default = router;
